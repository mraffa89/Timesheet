/**
 * Utilitários de Máscaras e Consulta Pública de CNPJ (BrasilAPI / Receita Federal)
 */

/**
 * Aplica máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00) dinamicamente
 */
export function formatCpfCnpj(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 14);
  
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Aplica máscara de Telefone Fixo (00) 0000-0000 ou Celular (00) 00000-0000
 */
export function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length <= 10) {
    // Fixo: (00) 0000-0000
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  
  // Celular: (00) 00000-0000
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

/**
 * Consulta dados cadastrais públicos de uma empresa pelo CNPJ via BrasilAPI / Minha Receita
 */
export async function fetchPublicCnpjData(cnpj) {
  const cleanCnpj = (cnpj || '').replace(/\D/g, '');
  if (cleanCnpj.length !== 14) {
    throw new Error('Informe um CNPJ válido com 14 dígitos para a consulta pública.');
  }

  // 1. Tenta consulta via BrasilAPI (Rápida, oficial e gratuita)
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    if (response.ok) {
      const data = await response.json();

      const addrParts = [];
      if (data.logradouro) addrParts.push(data.logradouro);
      if (data.numero) addrParts.push(`nº ${data.numero}`);
      if (data.complemento) addrParts.push(data.complemento);
      if (data.bairro) addrParts.push(data.bairro);
      if (data.municipio) addrParts.push(`${data.municipio}${data.uf ? '/' + data.uf : ''}`);
      if (data.cep) addrParts.push(`CEP: ${data.cep.replace(/^(\d{5})(\d{3})/, '$1-$2')}`);
      const fullAddress = addrParts.join(', ');

      let phoneFormatted = '';
      if (data.ddd_telefone_1) {
        phoneFormatted = formatPhone(data.ddd_telefone_1);
      }

      return {
        success: true,
        name: data.nome_fantasia || data.razao_social || '',
        legalName: data.razao_social || '',
        email: data.email || '',
        phone: phoneFormatted,
        address: fullAddress,
        cnpj: formatCpfCnpj(cleanCnpj),
        source: 'BrasilAPI / Receita Federal'
      };
    }
  } catch (err) {
    console.warn('Tentando fallback da consulta pública...');
  }

  // 2. Fallback via Minha Receita
  try {
    const response2 = await fetch(`https://minhareceita.org/${cleanCnpj}`);
    if (response2.ok) {
      const data = await response2.json();

      const addrParts = [];
      if (data.logradouro) addrParts.push(data.logradouro);
      if (data.numero) addrParts.push(`nº ${data.numero}`);
      if (data.complemento) addrParts.push(data.complemento);
      if (data.bairro) addrParts.push(data.bairro);
      if (data.municipio) addrParts.push(`${data.municipio}${data.uf ? '/' + data.uf : ''}`);
      if (data.cep) addrParts.push(`CEP: ${data.cep}`);
      const fullAddress = addrParts.join(', ');

      let phoneFormatted = '';
      if (data.ddd_telefone_1) {
        phoneFormatted = formatPhone(data.ddd_telefone_1);
      }

      return {
        success: true,
        name: data.nome_fantasia || data.razao_social || '',
        legalName: data.razao_social || '',
        email: data.email || '',
        phone: phoneFormatted,
        address: fullAddress,
        cnpj: formatCpfCnpj(cleanCnpj),
        source: 'Receita Federal'
      };
    }
  } catch (err2) {
    console.error('Falha na consulta pública de CNPJ:', err2);
  }

  throw new Error('Não foi possível localizar os dados deste CNPJ na base pública da Receita Federal. Verifique o número digitado.');
}
