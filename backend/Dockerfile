FROM public.ecr.aws/lambda/nodejs:20

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["lambda.handler"]
