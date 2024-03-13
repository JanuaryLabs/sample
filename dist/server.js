'use strict';

var hono = require('hono');
var cors = require('hono/cors');
var logger = require('hono/logger');
var rfc7807ProblemDetails = require('rfc-7807-problem-details');
var typeorm = require('typeorm');
var Ajv = require('ajv');
var addErrors = require('ajv-errors');
var addFormats = require('ajv-formats');
var validator = require('validator');
require('lodash');
var crypto = require('node:crypto');
var events = require('node:events');
var http = require('http');
var http2 = require('http2');
var stream = require('stream');
var crypto$1 = require('crypto');

async function loadSubject(req) {
  return null;
}

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __decorateClass = (decorators, target, key, kind) => {
  var result =
    kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if ((decorator = decorators[i]))
      result =
        (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
let Posts = class {
  deletedAt;
  updatedAt;
  createdAt;
  id;
};
__decorateClass([typeorm.DeleteDateColumn()], Posts.prototype, 'deletedAt', 2);
__decorateClass([typeorm.UpdateDateColumn()], Posts.prototype, 'updatedAt', 2);
__decorateClass([typeorm.CreateDateColumn()], Posts.prototype, 'createdAt', 2);
__decorateClass(
  [typeorm.PrimaryGeneratedColumn('uuid')],
  Posts.prototype,
  'id',
  2,
);
Posts = __decorateClass([typeorm.Entity()], Posts);

var entites = [Posts];

const options = {
  type: 'postgres',
  useUTC: true,
  url: 'postgresql://january-test_owner:U17cOgTaYXIm@ep-holy-flower-a5lkn70o.us-east-2.aws.neon.tech/january-test?sslmode=require',
  migrationsRun: true,
  entities: [...entites],
  logging: true,
  // process.env.NODE_ENV !== 'production'
  synchronize: true,
  // process.env.NODE_ENV !== 'production'
  ssl: process.env.NODE_ENV === 'production',
};
var dataSource = new typeorm.DataSource(options);

const ajv = new Ajv({
  allErrors: true,
  useDefaults: 'empty',
  removeAdditional: 'failing',
});
addErrors(ajv);
addFormats(ajv);
function isBetween(date, startDate, endDate) {
  if (!date) {
    return false;
  }
  if (!startDate) {
    return false;
  }
  if (!endDate) {
    return false;
  }
  return (
    validator.isAfter(date, startDate) && validator.isBefore(date, endDate)
  );
}
const validations = [
  ['isBefore', validator.isBefore],
  ['isAfter', validator.isAfter],
  ['isBoolean', validator.isBoolean],
  ['isDate', validator.isDate],
  ['isNumeric', validator.isNumeric],
  ['isLatLong', validator.isLatLong],
  ['isMobilePhone', validator.isMobilePhone],
  ['isEmpty', validator.isEmpty],
  ['isDecimal', validator.isDecimal],
  ['isURL', validator.isURL],
  ['isEmail', validator.isEmail],
  ['isBetween', isBetween],
];
validations.forEach(([key, value]) => {
  const keyword = key;
  ajv.addKeyword({
    keyword,
    validate: (schema, data) => {
      if (schema === void 0 || schema === null) {
        return false;
      }
      const func = value;
      return func.apply(validator, [
        data,
        ...(Array.isArray(schema) ? schema : [schema]),
      ]);
    },
  });
});
function createSchema(properties) {
  const required = Object.entries(properties)
    .filter(([, value]) => value.required)
    .map(([key]) => key);
  const clearProperties = Object.fromEntries(
    Object.entries(properties).map(([key, value]) => {
      const { required: required2, ...rest } = value;
      return [key, rest];
    }),
  );
  return {
    type: 'object',
    properties: clearProperties,
    required,
    additionalProperties: false,
  };
}
function validateInput(schema, input) {
  const validate = ajv.compile(schema);
  const valid = validate(input);
  if (!valid && validate.errors) {
    const errors = validate.errors.reduce((acc, it) => {
      const property = it.instancePath.replace('.', '').replace('/', '');
      return { ...acc, [property]: it.message || '' };
    }, {});
    throw errors;
  }
}
class ValidationFailedException extends rfc7807ProblemDetails.ProblemDetailsException {
  constructor(errors) {
    super({
      type: 'validation-failed',
      status: 400,
      title: 'Bad Request.',
      detail: 'Validation failed.',
    });
    this.Details.errors = errors;
  }
}
function validateOrThrow(schema, input) {
  try {
    validateInput(schema, input);
  } catch (errors) {
    throw new ValidationFailedException(errors);
  }
}

const end = Symbol('A symbol to mark the end of the operation');
const messageBus = new events.EventEmitter({ captureRejections: true });
async function handleOperation(operation, input) {
  const operationId = crypto.randomUUID();
  const message = {
    ...input,
    [end]: (output2, error) => {
      if (error) {
        console.error(`Error processing ${operation} operation `, error);
        throw error;
      }
      messageBus.emit(operationId, output2);
    },
  };
  messageBus.emit(operation, message);
  const output = await events.once(messageBus, operationId);
  messageBus.removeAllListeners(operationId);
  return output;
}
function listen(operation, callback) {
  messageBus.on(operation, async (message) => {
    const { [end]: endFn, ...input } = message;
    try {
      const output = await callback(input);
      endFn(output, null);
    } catch (error) {
      endFn(null, error);
    }
  });
}

const createPostSchema = createSchema({});
async function createPost$1({}) {
  const postsRepository = dataSource.getRepository(Posts);
  const newPost = await postsRepository.save({});
  return {
    data: newPost,
  };
}
listen('create_post', createPost$1);

async function execute(qb, ...mappers) {
  const { entities, raw } = await qb.getRawAndEntities();
  return entities.map((entity, index) => {
    return mappers.reduce((acc, mapper) => {
      return mapper(acc, raw[index]);
    }, entity);
  });
}
function deferredJoinPagination(qb, options) {
  const pageSize = options.pageSize;
  const pageNo = options.pageNo ?? 1;
  const offset = (pageNo - 1) * pageSize;
  const { tablePath: tableName } = qb.expressionMap.findAliasByName(qb.alias);
  if (!tableName) {
    throw new Error(`Could not find table path for alias ${qb.alias}`);
  }
  const subQueryAlias = `deferred_join_${tableName}`;
  qb.innerJoin(
    (subQuery) => {
      const subQueryTableAlias = `deferred_${tableName}`;
      return subQuery
        .from(tableName, subQueryTableAlias)
        .select(`${subQueryTableAlias}.id`, 'id')
        .orderBy(`${subQueryTableAlias}.createdAt`)
        .limit(pageSize)
        .offset(offset);
    },
    subQueryAlias,
    `${qb.alias}.id = ${subQueryAlias}.id`,
  );
  return (result) => ({
    hasNextPage: result.length === pageSize,
    hasPreviousPage: offset > 0,
    pageSize: options.pageSize,
    currentPage: options.pageNo,
    totalCount: options.count,
    totalPages: Math.ceil(options.count / options.pageSize),
  });
}
function createQueryBuilder(entity, alias) {
  const repo = dataSource.getRepository(entity);
  return repo.createQueryBuilder(alias);
}

const deletePostSchema = createSchema({
  id: {
    type: 'string',
  },
});
async function deletePost$1({ id }) {
  const deletedPostQB = createQueryBuilder(Posts, 'posts');
  deletedPostQB.andWhere((qb) => {
    deletedPostQB.andWhere('Posts.id = :id', { id });
  });
  const deletedPost = await deletedPostQB.getOneOrFail();
  await deletedPostQB.softDelete().execute();
  return {
    data: deletedPost,
  };
}
listen('delete_post', deletePost$1);

const postExistsSchema = createSchema({
  id: {
    type: 'string',
  },
});
async function postExists$1({ id }) {
  const postExistsQB = createQueryBuilder(Posts, 'postsRepository');
  postExistsQB.andWhere((qb) => {
    postExistsQB.andWhere('Posts.id = :id', { id });
  });
  const postExists2 = await postExistsQB.getOne().then(Boolean);
  return {
    data: postExists2,
  };
}
listen('post_exists', postExists$1);

const replacePostSchema = createSchema({
  id: {
    type: 'string',
  },
});
async function replacePost$1({ id }) {
  const postsRepository = dataSource.getRepository(Posts);
  const replacedPost = await postsRepository.save({ id });
  return {
    data: replacedPost,
  };
}
listen('replace_post', replacePost$1);

const getPostSchema = createSchema({
  id: {
    type: 'string',
  },
});
async function getPost$1({ id }) {
  const qb = createQueryBuilder(Posts, 'Posts');
  qb.andWhere((qb2) => {
    qb2.andWhere('Posts.id = :id', { id });
  });
  const post = (await execute(qb))[0];
  return {
    data: post,
  };
}
listen('get_post', getPost$1);

const updatePostSchema = createSchema({
  id: {
    type: 'string',
  },
});
async function updatePost$1({ id }) {
  const postsRepository = dataSource.getRepository(Posts);
  const updatedPost = await postsRepository.save({ id });
  return {
    data: updatedPost,
  };
}
listen('update_post', updatePost$1);

const listPostsSchema = createSchema({
  pageSize: {
    type: 'number',
    default: 50,
    required: true,
    minLength: 1,
    minimum: 1,
  },
  pageNo: {
    type: 'number',
    minimum: 1,
  },
});
async function listPosts$1({ pageSize, pageNo }) {
  const qb = createQueryBuilder(Posts, 'Posts');
  const paginationMetadata = deferredJoinPagination(qb, {
    pageSize,
    pageNo,
    count: await qb.getCount(),
  });
  const records = await execute(qb);
  const postsList = {
    meta: paginationMetadata(records),
    records,
  };
  return {
    data: postsList,
  };
}
listen('list_posts', listPosts$1);

async function createPost(context, next) {
  const input = {};
  validateOrThrow(createPostSchema, input);
  const output = await handleOperation('create_post', input);
  return context.json(output);
}

async function deletePost(context, next) {
  const pathParams = context.req.param();
  const input = { id: pathParams.id };
  validateOrThrow(deletePostSchema, input);
  const output = await handleOperation('delete_post', input);
  return context.json(output);
}

async function postExists(context, next) {
  const pathParams = context.req.param();
  const input = { id: pathParams.id };
  validateOrThrow(postExistsSchema, input);
  const output = await handleOperation('post_exists', input);
  return context.json(output);
}

async function replacePost(context, next) {
  const pathParams = context.req.param();
  const input = { id: pathParams.id };
  validateOrThrow(replacePostSchema, input);
  const output = await handleOperation('replace_post', input);
  return context.json(output);
}

async function getPost(context, next) {
  const pathParams = context.req.param();
  const input = { id: pathParams.id };
  validateOrThrow(getPostSchema, input);
  const output = await handleOperation('get_post', input);
  return context.json(output);
}

async function updatePost(context, next) {
  const pathParams = context.req.param();
  const input = { id: pathParams.id };
  validateOrThrow(updatePostSchema, input);
  const output = await handleOperation('update_post', input);
  return context.json(output);
}

async function listPosts(context, next) {
  const searchParams = context.req.query();
  const input = {
    pageSize: searchParams.pageSize,
    pageNo: searchParams.pageNo,
  };
  validateOrThrow(listPostsSchema, input);
  const output = await handleOperation('list_posts', input);
  return context.json(output);
}

const router = new hono.Hono();
router.post('/posts', createPost);
router.delete('/{id}/posts', deletePost);
router.get('/{id}/exists/posts', postExists);
router.put('/{id}/posts', replacePost);
router.get('/{id}/posts', getPost);
router.patch('/{id}/posts', updatePost);
router.get('/posts', listPosts);
var articlesRouter = ['/articles', router];

var routes = [articlesRouter];

const application = new hono.Hono();
application.use(cors.cors(), logger.logger());
application.use(async (context, next) => {
  const subject = await loadSubject(context.req);
  context.set('subject', subject);
  await next();
});
routes.forEach((route) => {
  application.route(...route);
});
dataSource
  .initialize()
  .then(() => {
    console.log('Database initialized');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
application.get('/', (context, next) => {
  return context.json({
    status: 'UP',
  });
});
application.get('/health', (context, next) => {
  return context.json({
    status: 'UP',
  });
});

// src/server.ts
var GlobalRequest = global.Request;
var Request = class extends GlobalRequest {
  constructor(input, options) {
    if (typeof input === 'object' && getRequestCache in input) {
      input = input[getRequestCache]();
    }
    if (options?.body instanceof ReadableStream) {
      options.duplex ??= 'half';
    }
    super(input, options);
  }
};
Object.defineProperty(global, 'Request', {
  value: Request,
});
var newRequestFromIncoming = (method, url, incoming, abortController) => {
  const headerRecord = [];
  const rawHeaders = incoming.rawHeaders;
  for (let i = 0; i < rawHeaders.length; i += 2) {
    const { [i]: key, [i + 1]: value } = rawHeaders;
    if (key.charCodeAt(0) /*:*/ !== 58) {
      headerRecord.push([key, value]);
    }
  }
  const init = {
    method,
    headers: headerRecord,
    signal: abortController.signal,
  };
  if (!(method === 'GET' || method === 'HEAD')) {
    init.body = stream.Readable.toWeb(incoming);
  }
  return new Request(url, init);
};
var getRequestCache = Symbol('getRequestCache');
var requestCache = Symbol('requestCache');
var incomingKey = Symbol('incomingKey');
var urlKey = Symbol('urlKey');
var abortControllerKey = Symbol('abortControllerKey');
var getAbortController = Symbol('getAbortController');
var requestPrototype = {
  get method() {
    return this[incomingKey].method || 'GET';
  },
  get url() {
    return this[urlKey];
  },
  [getAbortController]() {
    this[getRequestCache]();
    return this[abortControllerKey];
  },
  [getRequestCache]() {
    this[abortControllerKey] ||= new AbortController();
    return (this[requestCache] ||= newRequestFromIncoming(
      this.method,
      this[urlKey],
      this[incomingKey],
      this[abortControllerKey],
    ));
  },
};
[
  'body',
  'bodyUsed',
  'cache',
  'credentials',
  'destination',
  'headers',
  'integrity',
  'mode',
  'redirect',
  'referrer',
  'referrerPolicy',
  'signal',
  'keepalive',
].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    get() {
      return this[getRequestCache]()[k];
    },
  });
});
['arrayBuffer', 'blob', 'clone', 'formData', 'json', 'text'].forEach((k) => {
  Object.defineProperty(requestPrototype, k, {
    value: function () {
      return this[getRequestCache]()[k]();
    },
  });
});
Object.setPrototypeOf(requestPrototype, Request.prototype);
var newRequest = (incoming) => {
  const req = Object.create(requestPrototype);
  req[incomingKey] = incoming;
  req[urlKey] = new URL(
    `http://${
      incoming instanceof http2.Http2ServerRequest
        ? incoming.authority
        : incoming.headers.host
    }${incoming.url}`,
  ).href;
  return req;
};

// src/utils.ts
function writeFromReadableStream(stream, writable) {
  if (stream.locked) {
    throw new TypeError('ReadableStream is locked.');
  } else if (writable.destroyed) {
    stream.cancel();
    return;
  }
  const reader = stream.getReader();
  writable.on('close', cancel);
  writable.on('error', cancel);
  reader.read().then(flow, cancel);
  return reader.closed.finally(() => {
    writable.off('close', cancel);
    writable.off('error', cancel);
  });
  function cancel(error) {
    reader.cancel(error).catch(() => {});
    if (error) {
      writable.destroy(error);
    }
  }
  function onDrain() {
    reader.read().then(flow, cancel);
  }
  function flow({ done, value }) {
    try {
      if (done) {
        writable.end();
      } else if (!writable.write(value)) {
        writable.once('drain', onDrain);
      } else {
        return reader.read().then(flow, cancel);
      }
    } catch (e) {
      cancel(e);
    }
  }
}
var buildOutgoingHttpHeaders = (headers) => {
  const res = {};
  const cookies = [];
  for (const [k, v] of headers) {
    if (k === 'set-cookie') {
      cookies.push(v);
    } else {
      res[k] = v;
    }
  }
  if (cookies.length > 0) {
    res['set-cookie'] = cookies;
  }
  res['content-type'] ??= 'text/plain; charset=UTF-8';
  return res;
};

// src/response.ts
var responseCache = Symbol('responseCache');
var getResponseCache = Symbol('getResponseCache');
var cacheKey = Symbol('cache');
var GlobalResponse = global.Response;
var Response2 = class _Response {
  #body;
  #init;
  [getResponseCache]() {
    delete this[cacheKey];
    return (this[responseCache] ||= new GlobalResponse(this.#body, this.#init));
  }
  constructor(body, init) {
    this.#body = body;
    if (init instanceof _Response) {
      const cachedGlobalResponse = init[responseCache];
      if (cachedGlobalResponse) {
        this.#init = cachedGlobalResponse;
        this[getResponseCache]();
        return;
      } else {
        this.#init = init.#init;
      }
    } else {
      this.#init = init;
    }
    if (typeof body === 'string' || body instanceof ReadableStream) {
      let headers = init?.headers || {
        'content-type': 'text/plain; charset=UTF-8',
      };
      if (headers instanceof Headers) {
        headers = buildOutgoingHttpHeaders(headers);
      }
      this[cacheKey] = [init?.status || 200, body, headers];
    }
  }
};
[
  'body',
  'bodyUsed',
  'headers',
  'ok',
  'redirected',
  'status',
  'statusText',
  'trailers',
  'type',
  'url',
].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    get() {
      return this[getResponseCache]()[k];
    },
  });
});
['arrayBuffer', 'blob', 'clone', 'formData', 'json', 'text'].forEach((k) => {
  Object.defineProperty(Response2.prototype, k, {
    value: function () {
      return this[getResponseCache]()[k]();
    },
  });
});
Object.setPrototypeOf(Response2, GlobalResponse);
Object.setPrototypeOf(Response2.prototype, GlobalResponse.prototype);
Object.defineProperty(global, 'Response', {
  value: Response2,
});
var stateKey = Reflect.ownKeys(new GlobalResponse()).find(
  (k) => typeof k === 'symbol' && k.toString() === 'Symbol(state)',
);
if (!stateKey) {
  console.warn('Failed to find Response internal state key');
}
function getInternalBody(response) {
  if (!stateKey) {
    return;
  }
  if (response instanceof Response2) {
    response = response[getResponseCache]();
  }
  const state = response[stateKey];
  return (state && state.body) || void 0;
}
var webFetch = global.fetch;
if (typeof global.crypto === 'undefined') {
  global.crypto = crypto$1;
}
global.fetch = (info, init) => {
  init = {
    // Disable compression handling so people can return the result of a fetch
    // directly in the loader without messing with the Content-Encoding header.
    compress: false,
    ...init,
  };
  return webFetch(info, init);
};

// src/listener.ts
var regBuffer = /^no$/i;
var regContentType = /^(application\/json\b|text\/(?!event-stream\b))/i;
var handleFetchError = (e) =>
  new Response(null, {
    status:
      e instanceof Error &&
      (e.name === 'TimeoutError' || e.constructor.name === 'TimeoutError')
        ? 504
        : 500,
  });
var handleResponseError = (e, outgoing) => {
  const err = e instanceof Error ? e : new Error('unknown error', { cause: e });
  if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
    console.info('The user aborted a request.');
  } else {
    console.error(e);
    if (!outgoing.headersSent) {
      outgoing.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    outgoing.end(`Error: ${err.message}`);
    outgoing.destroy(err);
  }
};
var responseViaCache = (res, outgoing) => {
  const [status, body, header] = res[cacheKey];
  if (typeof body === 'string') {
    header['Content-Length'] = Buffer.byteLength(body);
    outgoing.writeHead(status, header);
    outgoing.end(body);
  } else {
    outgoing.writeHead(status, header);
    return writeFromReadableStream(body, outgoing)?.catch((e) =>
      handleResponseError(e, outgoing),
    );
  }
};
var responseViaResponseObject = async (res, outgoing, options = {}) => {
  if (res instanceof Promise) {
    if (options.errorHandler) {
      try {
        res = await res;
      } catch (err) {
        const errRes = await options.errorHandler(err);
        if (!errRes) {
          return;
        }
        res = errRes;
      }
    } else {
      res = await res.catch(handleFetchError);
    }
  }
  if (cacheKey in res) {
    return responseViaCache(res, outgoing);
  }
  const resHeaderRecord = buildOutgoingHttpHeaders(res.headers);
  const internalBody = getInternalBody(res);
  if (internalBody) {
    if (internalBody.length) {
      resHeaderRecord['content-length'] = internalBody.length;
    }
    outgoing.writeHead(res.status, resHeaderRecord);
    if (
      typeof internalBody.source === 'string' ||
      internalBody.source instanceof Uint8Array
    ) {
      outgoing.end(internalBody.source);
    } else if (internalBody.source instanceof Blob) {
      outgoing.end(new Uint8Array(await internalBody.source.arrayBuffer()));
    } else {
      await writeFromReadableStream(internalBody.stream, outgoing);
    }
  } else if (res.body) {
    const {
      'transfer-encoding': transferEncoding,
      'content-encoding': contentEncoding,
      'content-length': contentLength,
      'x-accel-buffering': accelBuffering,
      'content-type': contentType,
    } = resHeaderRecord;
    if (
      transferEncoding ||
      contentEncoding ||
      contentLength || // nginx buffering variant
      (accelBuffering && regBuffer.test(accelBuffering)) ||
      !regContentType.test(contentType)
    ) {
      outgoing.writeHead(res.status, resHeaderRecord);
      await writeFromReadableStream(res.body, outgoing);
    } else {
      const buffer = await res.arrayBuffer();
      resHeaderRecord['content-length'] = buffer.byteLength;
      outgoing.writeHead(res.status, resHeaderRecord);
      outgoing.end(new Uint8Array(buffer));
    }
  } else {
    outgoing.writeHead(res.status, resHeaderRecord);
    outgoing.end();
  }
};
var getRequestListener = (fetchCallback, options = {}) => {
  return async (incoming, outgoing) => {
    let res;
    const req = newRequest(incoming);
    outgoing.on('close', () => {
      if (incoming.destroyed) {
        req[getAbortController]().abort();
      }
    });
    try {
      res = fetchCallback(req, { incoming, outgoing });
      if (cacheKey in res) {
        return responseViaCache(res, outgoing);
      }
    } catch (e) {
      if (!res) {
        if (options.errorHandler) {
          res = await options.errorHandler(e);
          if (!res) {
            return;
          }
        } else {
          res = handleFetchError(e);
        }
      } else {
        return handleResponseError(e, outgoing);
      }
    }
    try {
      return responseViaResponseObject(res, outgoing, options);
    } catch (e) {
      return handleResponseError(e, outgoing);
    }
  };
};

// src/server.ts
var createAdaptorServer = (options) => {
  const fetchCallback = options.fetch;
  const requestListener = getRequestListener(fetchCallback);
  const createServer = options.createServer || http.createServer;
  const server = createServer(options.serverOptions || {}, requestListener);
  return server;
};
var serve = (options, listeningListener) => {
  const server = createAdaptorServer(options);
  server.listen(options?.port ?? 3e3, options.hostname ?? '0.0.0.0', () => {
    const serverInfo = server.address();
    listeningListener && listeningListener(serverInfo);
  });
  return server;
};

serve({
  fetch: application.fetch,
  port: process.env.PORT,
});
console.log('Server started on port http://localhost:3000/');
