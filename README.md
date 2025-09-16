# Dojotek AI Chatbot (Backend)

Dojotek AI Chatbot is a software system to help enterprise/company/corporate to build, configure, run, monitor multiple Chatbot AI LLM RAG.

The AI Chatbots can be exposed to multiple channels:
- Slack
- Microsoft Team
- Lark
- Discord
- Telegram
- WhatsApp
- intranet company portal as chat widget
- company public website as chat widget
- etc

The original idea of this project is to be used on the following business verticals or company division:
- Hospital / Clinic
- Corporate Health Insurance Company
- Ecommerce
- Legal and Compliance
- Sales Enablement
- Technical Support
- Customer Support


## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run linter, tests, build

```bash
# eslint linter
$ pnpm run lint

# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov

# build
$ pnpm run build
```

## PostgreSQL database with Prisma ORM

```bash
# generate a new schema migration
$ pnpm prisma migrate dev --name <name>

# apply pending schema migrations
$ pnpm prisma migrate deploy

# reset database, and re-apply all schema migrations (Prisma doesn't have rollback feature)
$ pnpm prisma migrate reset

# generate Prisma Client, strong-typed ORM interfaces for JS/TS
$ pnpm prisma generate
```

## Database seeders

```bash
# seed roles only
$ pnpm run seed:roles

# seed users only (requires roles to be seeded first)
$ pnpm run seed:users

# seed all data (roles first, then users)
$ pnpm run seed:all
```

## Support

Dojotek AI Chatbot is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers.


## Stay in touch

- Author - [Andy Primawan](https://www.linkedin.com/in/andy-primawan/)


## License

Dojotek AI Chatbot Backend is [MIT licensed](https://github.com/dojotek/dojotek-ai-chatbot-backend/blob/master/LICENSE).
