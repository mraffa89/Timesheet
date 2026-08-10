const fs = require('fs');
const file = 'src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

const target = `              onSyncClients={async (syncedList) => {
                setClients(syncedList);
                saveClients(syncedList);
                if (isOnline) {
                  try {
                    for (const c of syncedList) {
                      if (clients.some(existing => existing.id === c.id)) {
                        await updateClientDb(c.id, c);
                      } else {
                        await addClientDb(c);
                      }
                    }
                  } catch (err) {
                    console.error(err);
                    alert("Erro ao sincronizar com Supabase: " + err.message);
                  }
                }
              }}`;

const replacement = `              onSyncClients={async (syncedList) => {
                if (!isOnline) {
                  setClients(syncedList);
                  saveClients(syncedList);
                  return;
                }
                
                try {
                  const dbUpdatedClients = [];
                  for (const c of syncedList) {
                    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
                    
                    if (clients.some(existing => existing.id === c.id) && isValidUuid) {
                      const updated = await updateClientDb(c.id, c);
                      dbUpdatedClients.push(updated);
                    } else {
                      const added = await addClientDb(c);
                      dbUpdatedClients.push(added);
                    }
                  }
                  setClients(dbUpdatedClients);
                  saveClients(dbUpdatedClients);
                } catch (err) {
                  console.error(err);
                  alert("Erro ao sincronizar com Supabase: " + err.message);
                }
              }}`;

if (content.includes('onSyncClients={async (syncedList) => {')) {
  // Manual string replacement based on lines
  const lines = content.split('\n');
  const startIdx = lines.findIndex(l => l.includes('onSyncClients={async (syncedList) => {'));
  let endIdx = startIdx;
  let braces = 0;
  for (let i = startIdx; i < lines.length; i++) {
    if (lines[i].includes('{')) braces += (lines[i].match(/\{/g) || []).length;
    if (lines[i].includes('}')) braces -= (lines[i].match(/\}/g) || []).length;
    if (braces === 0) {
      endIdx = i;
      break;
    }
  }
  
  lines.splice(startIdx, endIdx - startIdx + 1, replacement);
  fs.writeFileSync(file, lines.join('\n'));
  console.log("Fixed successfully!");
}
