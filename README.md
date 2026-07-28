# Tiger Bus — 巴士調度派遣管理系統

## 本機開發設置

1. `npm install`
2. `cp .env.example .env`
3. `docker compose up -d`
4. `npx prisma migrate dev`
5. `npx prisma db seed`
6. `npm run dev`

## 測試

- `npm test` 跑一次
- `npm run test:watch` 監看模式
- 測試需要 `docker compose up -d` 已啟動的 `postgres_test` 服務，且已對它跑過一次

```bash
DATABASE_URL="postgresql://tiger_bus:tiger_bus@localhost:5433/tiger_bus_test" npx prisma migrate deploy
```

- 測試檔案間共用同一個真實 Postgres 測試資料庫（每個檔案的 `beforeEach` 都會清空全部資料表），所以 `vitest.config.ts` 已設定 `fileParallelism: false`，測試檔案是依序執行、不平行跑的

## 測試帳號（seed 後可用，密碼皆為 password123）

| 角色 | Email |
|---|---|
| Superadmin | superadmin@tigerbus.dev |
| 車行管理者 | admin@test-fleet.dev |
| 調度接單 | dispatcher@test-fleet.dev |
| 會計 | accountant@test-fleet.dev |
| 司機 | driver@test-fleet.dev |

## 手動驗收清單

- [ ] 調度接單登入，建立一趟跨天行程（開始/結束日期不同），指派司機，確認自動帶出車號
- [ ] 行事曆頁面切換「司機為欄」與「月曆式」，確認跨天行程正確橫跨顯示
- [ ] 為該行程新增收支項目（車資、油資）
- [ ] 將行程狀態轉為已完成
- [ ] 會計登入，為該司機該月產生結算單，確認金額正確
- [ ] 標記結算單已付款
- [ ] 查看營運總覽，確認該月數字反映剛才的結算
- [ ] 司機帳號登入，確認只能看到自己的班表

## 與原始計畫的差異

實作過程中因為 Prisma 7（本專案使用的版本）與計畫撰寫時的假設不同，做了以下調整：

- **PrismaClient 建構方式**：Prisma 7 不再允許 `PrismaClient` 自動讀取 `DATABASE_URL`，一律要求明確傳入 driver adapter。`src/lib/db.ts`、`tests/support/test-db.ts`、`scripts/seed.ts` 都改用 `@prisma/adapter-pg` 的 `PrismaPg` adapter
- **Seed 指令設定位置**：從 `package.json` 的 `"prisma.seed"` 欄位改為 `prisma.config.ts` 的 `migrations.seed`（Prisma 7 不再讀 `package.json`）
- **NextAuth v5 型別擴充**：`next-auth/jwt` 只是重新匯出 `@auth/core/jwt`，型別擴充必須直接對 `@auth/core/jwt` 做 declaration merging，對 `next-auth/jwt` 做沒有效果
