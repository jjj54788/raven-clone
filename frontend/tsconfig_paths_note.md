# 注意

create-next-app 时使用了 --import-alias "@/*"，所以 tsconfig.json 中已经配置了:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

这使得 `@/components/Sidebar` 等导入路径能正常工作。
如果你的 tsconfig.json 中没有这个配置，请手动添加。
