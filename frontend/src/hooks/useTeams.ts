'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createTeamFromDraft,
  loadTeams,
  saveTeams,
  type Team,
  type TeamDraft,
} from '@/lib/teams';

export function useTeams(ownerName?: string, enabled = true) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const loaded = loadTeams(ownerName);
    setTeams(loaded);
    setReady(true);
  }, [ownerName, enabled]);

  const persist = useCallback((next: Team[]) => {
    setTeams(next);
    saveTeams(next);
  }, []);

  const addTeam = useCallback(
    (draft: TeamDraft) => {
      const created = createTeamFromDraft(draft, ownerName);
      setTeams((prev) => {
        const next = [created, ...prev];
        saveTeams(next);
        return next;
      });
      return created;
    },
    [ownerName],
  );

  const replaceTeam = useCallback((id: string, updater: (team: Team) => Team) => {
    setTeams((prev) => {
      const next = prev.map((team) => (team.id === id ? updater(team) : team));
      saveTeams(next);
      return next;
    });
  }, []);

  const removeTeam = useCallback((id: string) => {
    setTeams((prev) => {
      const next = prev.filter((team) => team.id !== id);
      saveTeams(next);
      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    if (!enabled) return;
    const loaded = loadTeams(ownerName);
    setTeams(loaded);
    setReady(true);
  }, [ownerName, enabled]);

  return {
    teams,
    ready,
    addTeam,
    replaceTeam,
    removeTeam,
    refresh,
  };
}


