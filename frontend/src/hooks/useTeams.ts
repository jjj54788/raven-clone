'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  listTeams, createTeam, updateTeam, deleteTeam,
  createTeamAssistant, deleteTeamAssistant, updateTeamAssistant,
} from '@/lib/api';
import {
  apiTeamSummaryToTeam,
  getAssistantCatalog,
  type Team, type TeamDraft, type TeamAssistantCatalogItem,
} from '@/lib/teams';

export function useTeams(authReady = true) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await listTeams();
      setTeams((data ?? []).map(apiTeamSummaryToTeam));
    } catch {
      setTeams([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (authReady) refresh();
  }, [authReady, refresh]);

  const addTeam = useCallback(async (draft: TeamDraft & { assistantItems?: TeamAssistantCatalogItem[] }) => {
    const team = await createTeam({
      name: draft.name,
      description: draft.description,
      tags: draft.tags,
      goal: draft.goal,
    });

    // Resolve catalog items — prefer explicit items, fall back to static catalog lookup
    const catalog = getAssistantCatalog();
    const orderedItems = draft.assistantItems
      ?? draft.assistantIds.map((id) => catalog.find((c) => c.id === id)).filter((c): c is TeamAssistantCatalogItem => !!c);

    for (let i = 0; i < orderedItems.length; i++) {
      const item = orderedItems[i];
      await createTeamAssistant(team.id, {
        displayName: item.name,
        modelId: item.model,
        provider: item.provider,
        roleTitle: item.role || undefined,
        isLeader: i === 0,
        sortOrder: i,
        iconText: item.iconText,
        accent: item.accent,
        catalogId: item.id,
      });
    }

    await refresh();
    return team;
  }, [refresh]);

  const replaceTeam = useCallback(async (updated: Team, prev: Team) => {
    await updateTeam(updated.id, {
      name: updated.name,
      description: updated.description,
      tags: updated.tags,
      goal: updated.goal,
      status: updated.status?.toUpperCase(),
      canvasJson: updated.canvas ?? null,
    });

    const oldIds = new Set(prev.assistants.map((a) => a.id));
    const newIds = new Set(updated.assistants.map((a) => a.id));

    for (const a of prev.assistants) {
      if (!newIds.has(a.id)) await deleteTeamAssistant(updated.id, a.id);
    }

    for (const a of updated.assistants) {
      if (oldIds.has(a.id)) {
        await updateTeamAssistant(updated.id, a.id, {
          roleTitle: a.role || undefined,
          asStatus: a.status?.toUpperCase(),
          isLeader: a.id === updated.leaderId,
          sortOrder: updated.assistants.indexOf(a),
        });
      }
    }

    await refresh();
  }, [refresh]);

  const removeTeam = useCallback(async (teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    try {
      await deleteTeam(teamId);
    } catch {
      await refresh();
    }
  }, [refresh]);

  return { teams, ready, addTeam, replaceTeam, removeTeam, refresh };
}


