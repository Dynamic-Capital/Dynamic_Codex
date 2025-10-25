<!-- BEGIN DOCS:SECTION:daily-workflow -->
# Daily workflow
1. Sync with main: `git fetch --all --prune` and rebase.
2. Run `npm run check:secrets` and `npm run verify:functions`.
3. Review `/config` for overrides and adjust via Config Hub.
4. Code on feature branches, commit often, push with tests.
5. Deploy through CI or ChatOps (`/deploy`) when ready.
<!-- END DOCS:SECTION:daily-workflow -->

<!-- BEGIN DOCS:SECTION:edit-boundaries -->
## Edit boundaries
✅ Edge functions, packages, Mini App, docs.
❌ Supabase migrations already applied, secrets, CI templates without approval.
<!-- END DOCS:SECTION:edit-boundaries -->

<!-- BEGIN DOCS:SECTION:accident-playbook -->
## Accident playbook
- Reset webhook: `curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook`
- Rollback bad deploy: `git revert <sha>` then `/deploy`
- Secret leak: rotate key, update GitHub, alert @Dynamic_Capital_Admin and @DynamicCapital_Support
<!-- END DOCS:SECTION:accident-playbook -->
