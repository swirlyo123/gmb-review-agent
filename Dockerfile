FROM node:20

WORKDIR /app

# Copy everything
COPY . .

# Build frontend
RUN cd frontend && npm install && npm run build

# Install backend dependencies and generate Prisma client
RUN cd backend && npm install && npx prisma generate --schema=src/db/schema.prisma

EXPOSE 3001

CMD ["sh", "-c", "cd backend && npx prisma db push --schema=src/db/schema.prisma && node src/index.js"]
