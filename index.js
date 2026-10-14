const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const pino = require('pino')
const fs = require('fs')
const config = require('./config')

const authDir = './auth'
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir)

async function iniciarBot() {
  const { version } = await fetchLatestBaileysVersion()
  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  
  const bot = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Bot WhatsApp', 'Chrome', '10.0']
  })

  bot.ev.on('creds.update', saveCreds)

  bot.ev.on('connection.update', (atualizacao) => {
    const { connection, qr } = atualizacao
    if (qr) {
      console.log('📱 Escaneia este código QR com o WhatsApp:')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') console.log('✅ BOT ONLINE!')
    if (connection === 'close') iniciarBot()
  })

  bot.ev.on('messages.upsert', async (dados) => {
    const msg = dados.messages[0]
    if (!msg.key.fromMe && msg.message) {
      const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
      const grupo = msg.key.remoteJid?.endsWith('@g.us')
      
      // APAGAR LINKS
      if (grupo && /(http|www\.|instagram\.|facebook\.|tiktok\.|youtu\.|wa\.me)/i.test(texto)) {
        bot.sendMessage(msg.key.remoteJid, { delete: msg.key }).catch(err => console.log('Erro:', err))
        bot.sendMessage(msg.key.remoteJid, { text: '⚠️ Link apagado! Proibido enviar links.' }).catch(err => console.log('Erro:', err))
        return
      }
      
      // COMANDOS
      if (texto.startsWith(config.prefixo)) {
        const comando = texto.slice(1).trim().toLowerCase()
        const remetente = msg.key.participant || msg.key.remoteJid
        const eDono = config.dono.some(dono => remetente.includes(dono))
        if (!eDono) return
        
        if (comando === 'grupo a' || comando === 'gp a') {
          bot.groupSettingUpdate(msg.key.remoteJid, 'not_announcement').catch(err => console.log('Erro:', err))
          bot.sendMessage(msg.key.remoteJid, { text: '✅ Grupo ABERTO!' }).catch(err => console.log('Erro:', err))
          return
        }
        if (comando === 'grupo f' || comando === 'gp f') {
          bot.groupSettingUpdate(msg.key.remoteJid, 'announcement').catch(err => console.log('Erro:', err))
          bot.sendMessage(msg.key.remoteJid, { text: '🔒 Grupo FECHADO!' }).catch(err => console.log('Erro:', err))
          return
        }
        if (comando.startsWith('ban ') && msg.mentionedJid?.length > 0) {
          const usuario = msg.mentionedJid[0]
          bot.groupParticipantsUpdate(msg.key.remoteJid, [usuario], 'remove').catch(err => console.log('Erro:', err))
          bot.sendMessage(msg.key.remoteJid, { text: '✅ Usuário removido!' }).catch(err => console.log('Erro:', err))
          return
        }
      }
    }
  })
}

iniciarBot()
        
