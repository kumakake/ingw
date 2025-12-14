const pino = require('pino');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../logs');

// ログディレクトリ作成
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProduction
    ? {
        targets: [
          // コンソール出力
          {
            target: 'pino-pretty',
            options: { 
              colorize: false,
              translateTime: 'yyyy-mm-dd HH:MM:ss'
            },
            level: 'info'
          },
          // ファイル出力（日次ローテーション）
          {
            target: 'pino-roll',
            options: {
              file: path.join(logDir, 'app'),
              frequency: 'daily',
              mkdir: true,
              extension: '.log'
            },
            level: 'info'
          }
        ]
      }
    : {
        target: 'pino-pretty',
        options: { 
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss'
        }
      }
});

// カテゴリ別ロガー作成
const createLogger = (category) => logger.child({ category });

module.exports = {
  logger,
  createLogger,
  httpLogger: require('pino-http')({ logger })
};
