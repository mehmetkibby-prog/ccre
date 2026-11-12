// Clear only the two retired test collectors. Preserve their empty schemas for
// rollback compatibility and leave account/security audit and gameplay data alone.
// Freed SQLite pages are reusable; avoid a blocking full-database VACUUM at startup.
export function retireDiagnosticStorage(db) {
 db.exec('SAVEPOINT retire_diagnostics');
 try {
  for(const table of ['security_diagnostics','connection_diagnostics']) {
   if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) {
    db.exec(`DELETE FROM ${table}`);
   }
  }
  db.exec('RELEASE retire_diagnostics');
 } catch(error) {
  db.exec('ROLLBACK TO retire_diagnostics; RELEASE retire_diagnostics');
  throw error;
 }
}
