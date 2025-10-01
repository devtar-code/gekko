import superagent from 'superagent'
import noCache from 'superagent-no-cache'
import { restPath } from './api.js'

const processResponse = next => (err, res) => {
  if (err) return next(err);

  // Prefer parsed JSON body if available, fallback to text
  let data = res && res.body ? res.body : null;
  if (!data && res && typeof res.text === 'string' && res.text.length) {
    try {
      data = JSON.parse(res.text);
    } catch (e) {
      return next(e);
    }
  }

  if (!data) return next('no data');
  next(false, data);
}

export const post = (to, data, next) => {
  superagent
    .post(restPath + to)
    .use(noCache)
    .set('Content-Type', 'application/json')
    .set('Accept', 'application/json')
    // send raw string to ensure Content-Length matches body
    .send(JSON.stringify(data || {}))
    .end(processResponse(next));
}

export const get = (to, next) => {
  superagent
    .get(restPath + to)
    .use(noCache)
    .end(processResponse(next));
}
