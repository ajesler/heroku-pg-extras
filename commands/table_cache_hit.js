'use strict'

const co = require('co')
const cli = require('heroku-cli-util')
const pg = require('@heroku-cli/plugin-pg-v5')

function * run (context, heroku) {
  let db = yield pg.fetcher(heroku).database(context.app, context.args.database)

  let query = `
SELECT
  relname AS name,
  heap_blks_hit AS buffer_hits,
  heap_blks_read AS block_reads,
  heap_blks_hit + heap_blks_read AS total_read,
  CASE (heap_blks_hit + heap_blks_read)::float
    WHEN 0 THEN 'Insufficient data'
    ELSE (heap_blks_hit / (heap_blks_hit + heap_blks_read)::float)::text
  END ratio
FROM
  pg_statio_user_tables
ORDER BY
  heap_blks_hit / (heap_blks_hit + heap_blks_read + 1)::float DESC;
`

  let output = yield pg.psql.exec(db, query)
  process.stdout.write(output)
}

const cmd = {
  topic: 'pg',
  description: 'calculates your cache hit rate for reading tables (effective databases are at 99% and up)',
  needsApp: true,
  needsAuth: true,
  args: [{name: 'database', optional: true}],
  run: cli.command({preauth: true}, co.wrap(run))
}

module.exports = [
  Object.assign({command: 'table-cache-hit'}, cmd),
  Object.assign({command: 'table_cache_hit', hidden: true}, cmd)
]
