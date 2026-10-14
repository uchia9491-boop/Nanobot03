const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const config = require('./config')

const authDir = './auth'
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir)

function iniciarBot() {
  Promise.all([
    fetchLatestBaileysVersion(),
    useMultiFileAuthState(authDir)
  ]).then(function(resultados) {
    const version = resultados[0].version
    const state = resultados[1].state
    const saveCreds = resultados[1].saveCreds
    
    const bot = makeWASocket({
      version: version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Bot WhatsApp', 'Chrome', '10.0']
    })

    bot.ev.on('creds.update', saveCreds)

    bot.ev.on('connection.update', function(atualizacao) {
      const connection = atualizacao.connection
      const pairingCode = atualizacao.pairingCode
      
      if (pairingCode) {
        console.log('\n' + '═'.repeat(55))
        console.log('  CÓDIGO DE PAREAMENTO:  ' + pairingCode)
        console.log('═'.repeat(55))
        console.log('  ABRE O WHATSAPP:')
        console.log('   Definições → Dispositivos ligados → Ligar um dispositivo')
        console.log('   → Clica em "Usar código de pareamento"')
        console.log('   → Digita o código acima\n')
      }
      
      if (connection === 'open') {
        console.log('✅ ✅ BOT CONECTADO E ONLINE! ✅ ✅')
      }
      
      if (connection === 'close') {
        console.log('🔄 Reconectando...')
        iniciarBot()
      }
    })

    bot.ev.on('messages.upsert', function(dados) {
      const msg = dados.messages[0]
      if (!msg.key.fromMe && msg.message) {
        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const grupo = msg.key.remoteJid ? msg.key.remoteJid.endsWith('@g.us') : false
        
        if (grupo && /(http|www\.|instagram\.|facebook\.|tiktok\.|youtu\.|wa\.me)/i.test(texto)) {
          bot.sendMessage(msg.key.remoteJid, { delete: msg.key }).catch(function(err) { console.log('Erro:', err) })
          bot.sendMessage(msg.key.remoteJid, { text: '⚠️ Link apagado! Proibido enviar links.' }).catch(function(err) { console.log('Erro:', err) })
          return
        }
        
        if (texto.startsWith(config.prefixo)) {
          const comando = texto.slice(1).trim().toLowerCase()
          const remetente = msg.key.participant || msg.key.remoteJid
          const eDono = config.dono.some(function(dono) { return remetente.includes(dono) })
          if (!eDono) return
          
          if (comando === 'grupo a' || comando === 'gp a') {
            bot.groupSettingUpdate(msg.key.remoteJid, 'not_announcement').catch(function(err) { console.log('Erro:', err) })
            bot.sendMessage(msg.key.remoteJid, { text: '✅ Grupo ABERTO!' }).catch(function(err) { console.log('Erro:', err) })
            return
          }
          if (comando === 'grupo f' || comando === 'gp f') {
            bot.groupSettingUpdate(msg.key.remoteJid, 'announcement').catch(function(err) { console.log('Erro:', err) })
            bot.sendMessage(msg.key.remoteJid, { text: '🔒 Grupo FECHADO!' }).catch(function(err) { console.log('Erro:', err) })
            return
          }
          if (comando.startsWith('ban ') && msg.mentionedJid && msg.mentionedJid.length > 0) {
            const usuario = msg.mentionedJid[0]
            bot.groupParticipantsUpdate(msg.key.remoteJid, [usuario], 'remove').catch(function(err) { console.log('Erro:', err) })
            bot.sendMessage(msg.key.remoteJid, { text: '✅ Usuário removido!' }).catch(function(err) { console.log('Erro:', err) })
            return
          }
        }
      }
    })
  })
}

iniciarBot()
      
