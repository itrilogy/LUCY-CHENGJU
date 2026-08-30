# IQS DSL 语法手册（入口）

> **现行完整权威（细粒度）**  
> → **[docs/IQS_DSL_V1_MANUAL.md](./docs/IQS_DSL_V1_MANUAL.md)**  
>
> **架构概要**  
> → **[docs/IQS_DSL_V1_SPEC.md](./docs/IQS_DSL_V1_SPEC.md)**  
>
> **Kind 注册表**  
> → **[dsl/kinds.json](./dsl/kinds.json)**

本文件仅为**入口索引**。请勿在旧副本中继续增补语法；所有修订进入 `IQS_DSL_V1_MANUAL.md`。

## 三层结构速记

```text
Shell（Title / Color / Font / Show* / //注释）
  + Directives（按 kind 白名单）
  + Body（Tree | ItemTree | Pairs | ScalarList | TupleList
         | Series | AxisSeries | Graph | Network | ProcessGraph
         | Matrix | Table | Dataset）
```

## Core vs Relief

- **CORE** `iqs_native`：成果报告专业图 → IQS-DSL v1  
- **RELIEF** Mermaid / VChart：类型外制图，不替代 SPC/排列图等终稿  

## 校验

```bash
npm run validate:dsl
```
