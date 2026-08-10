/**
 * Smartly classifies a demand description into a specific category.
 * Categories: Reunião, Programação, Planejamento, Impressos, Digital (default)
 */
export function classifyDemand(description) {
  if (!description) return 'Digital';
  const desc = description.toLowerCase();
  
  if (
    desc.includes('reunião') || 
    desc.includes('call') || 
    desc.includes('alinhamento') || 
    desc.includes('briefing') || 
    desc.includes('conversa') ||
    desc.includes('feedback')
  ) {
    return 'Reunião';
  }
  
  if (
    desc.includes('código') || 
    desc.includes('site') || 
    desc.includes('landing') || 
    desc.includes('lp') || 
    desc.includes('sistema') || 
    desc.includes('desenvolvimento') || 
    desc.includes('dev') || 
    desc.includes('integra') || 
    desc.includes('bug') ||
    desc.includes('api') ||
    desc.includes('database') ||
    desc.includes('banco')
  ) {
    return 'Programação';
  }
  
  if (
    desc.includes('organização') || 
    desc.includes('planejamento') || 
    desc.includes('cronograma') || 
    desc.includes('gestão') || 
    desc.includes('pauta') || 
    desc.includes('organizar') ||
    desc.includes('controle') ||
    desc.includes('tarefa')
  ) {
    return 'Planejamento';
  }
  
  if (
    desc.includes('impresso') || 
    desc.includes('impressão') || 
    desc.includes('cartaz') || 
    desc.includes('folder') || 
    desc.includes('panfleto') || 
    desc.includes('tag') ||
    desc.includes('lona') ||
    desc.includes('adesivo')
  ) {
    return 'Impressos';
  }
  
  return 'Digital'; // Default
}
