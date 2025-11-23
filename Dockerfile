# Node.js 18 LTS をベースイメージとして使用
FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci

# アプリケーションのソースコードをコピー
COPY . .

# アプリケーションが使用するポートを公開
EXPOSE 3000

# 開発モードで起動（nodemon使用）
CMD ["npm", "run", "dev"]
