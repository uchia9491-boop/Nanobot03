const makeWASocket = require('@whiskeysockets/baileys').default
const { useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')

const authDir = './auth'
if (!fs.existsSync(authDir)) fs.mkdirSync(authDir)

function iniciarBot() {
  useMultiFileAuthState(authDir).then(({ state, saveCreds }) => {

    const bot = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Bot WhatsApp', 'Chrome', '10.0']
    })

    bot.ev.on('creds.update', saveCreds)

    bot.ev.on('connection.update', (update) => {
      const { connection, pairingCode } = update

      if (pairingCode) {
        console.log('\n' + '='.repeat(50))
        console.log('CODIGO DE PAREAMENTO: ' + pairingCode)
        console.log('Abra o WhatsApp > Definicoes > Dispositivos ligados')
        console.log('Clique em "Ligar um dispositivo" > "Usar codigo de pareamento"')
        console.log('Digite o codigo acima')
        console.log('='.repeat(50) + '\n')
      }

      if (connection === 'open') {
        console.log('BOT ONLINE!')
      }

      if (connection === 'close') {
        console.log('Reconectando...')
        iniciarBot()
      }
    })

    // ==============================================
    // COLOCA O RESTO DO TEU CÓDIGO / COMANDOS ABAIXO
    // ==============================================

  })
}

iniciarBot()
