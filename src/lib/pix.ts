// Gerador oficial do padrão Pix BR Code / EMV QR Code

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function gerarPixCopiaECola(params: {
  chavePix: string;
  nomeTitular: string;
  cidade: string;
  valor?: number;
  identificador?: string;
}): string {
  const { chavePix, nomeTitular, cidade, valor, identificador = '***' } = params;

  // Limpeza de caracteres não ASCII
  const chaveLimpa = chavePix.trim();
  const nomeLimpo = nomeTitular
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 25)
    .toUpperCase();
  const cidadeLimpa = (cidade || 'SAO PAULO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .slice(0, 15)
    .toUpperCase();

  // 00 - Payload Format Indicator
  let payload = formatField('00', '01');

  // 26 - Merchant Account Information (Pix)
  const gui = formatField('00', 'br.gov.bcb.pix');
  const chave = formatField('01', chaveLimpa);
  payload += formatField('26', `${gui}${chave}`);

  // 52 - Merchant Category Code
  payload += formatField('52', '0000');

  // 53 - Transaction Currency (986 = Real Brasileiro)
  payload += formatField('53', '986');

  // 54 - Transaction Amount (se houver valor)
  if (valor && valor > 0) {
    payload += formatField('54', valor.toFixed(2));
  }

  // 58 - Country Code
  payload += formatField('58', 'BR');

  // 59 - Merchant Name
  payload += formatField('59', nomeLimpo || 'LOJA');

  // 60 - Merchant City
  payload += formatField('60', cidadeLimpa || 'BRASIL');

  // 62 - Additional Data Field (txid)
  const txid = formatField('05', identificador);
  payload += formatField('62', txid);

  // 63 - CRC16
  const payloadComIdCrc = `${payload}6304`;
  const checksum = crc16(payloadComIdCrc);

  return `${payloadComIdCrc}${checksum}`;
}
