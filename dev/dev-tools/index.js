import express from 'express';
import next from 'next';
import cors from 'cors';
import bodyParser from 'body-parser';
import compression from 'compression';

const isProduction = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT, 10) || 3333;
const app = next({ dev: !isProduction, quiet: true });

const processRequest = (req, res) => {
  return app.render(req, res, '/');
};

app.prepare().then(() => {
  const server = express();

  server.use('/static', express.static('static'));
  server.use(
    bodyParser.urlencoded({
      extended: false,
    })
  );
  server.use(
    cors({
      origin: '*',
    })
  );

  if (isProduction) {
    server.use(compression());
  }

  server.get('*', processRequest);

  server.listen(port, err => {
    if (err) {
      throw err;
    }

    console.log(`Running on localhost:${port}`);
  });
});
