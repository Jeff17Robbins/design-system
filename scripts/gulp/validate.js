// Copyright (c) 2015-present, salesforce.com, inc. All rights reserved
// Licensed under BSD 3-Clause - see LICENSE.txt or git.io/sfdc-license

const gulp = require("gulp");
const gutil = require("gulp-util");
const _ = require("lodash");
const through = require("through2");
const path = require("path");
const {
  createValidator
} = require("@salesforce-ux/design-system-markup/server");
const createParser = require("@salesforce-ux/design-system-parser");

const getComments = require("../ui/comments");

const renderMessage = result =>
  `${result.selector} not applied to ${result.restrict}`;

const shortReport = errors =>
  _(errors).groupBy(x => x).mapValues(v => v.length).value();

const renderReport = (fullReport, fileCount) => ({
  uniqueErrors: Object.keys(fullReport).length,
  total: Object.keys(fullReport).reduce(
    (acc, k) => acc + fullReport[k].length,
    0
  ),
  fileCount,
  report: _.mapValues(fullReport, shortReport)
});

const create = filepath => (fullReport, r) => {
  const msg = renderMessage(r);
  return Object.assign(fullReport, {
    [msg]: (fullReport[msg] || []).concat(filepath)
  });
};

const printToConsole = (...xs) => console.log.apply(console, xs);

const report = validate => {
  const fullReport = {};
  let count = 0;
  const transform = (file, enc, next) => {
    const results = validate(file.contents);
    if (results.length) {
      _(results).reduce(create(file.path), fullReport);
    }
    count += 1;
    next(null, file, enc);
  };

  const flush = function(next) {
    const report = renderReport(fullReport, count);
    const json = JSON.stringify(report, null, 2);
    printToConsole(json, "Full info in .reports/validate.json");
    this.push(
      new gutil.File({
        path: "validations.json",
        contents: Buffer.from(json)
      })
    );
    next();
  };

  return through.obj(transform, flush);
};

const runValidations = validate =>
  gulp.src([".html/*"]).pipe(report(validate)).pipe(gulp.dest(".reports/"));

const validate = () =>
  getComments()
    .map(createParser)
    .map(parser =>
      createValidator(parser.comments.map(c => c.get("annotations")))
    )
    .map(runValidations);

module.exports = { validate };
