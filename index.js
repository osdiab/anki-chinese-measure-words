const yargs = require("yargs");
const parseCsv = require("csv-parse/lib/sync"); // use sync for simplicity
const stringifyCsv = require("csv-stringify/lib/sync");
const process = require("process");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

function getConsoleArgs() {
  const {
    delimiter,
    chineseColumn,
    measureWordColumn,
    measureWordPinyinColumn,
    measureWordEnglishColumn,
    inputFile,
    outputFile
  } = yargs
    .option("delimiter", {
      alias: "d",
      desc:
        "Delimiter in the input file; must be a single character. Defaults to tab character, since that's what Anki exports.",
      type: "string",
      default: "\t",
      required: true
    })
    .option("chineseColumn", {
      alias: ["c"],
      desc:
        "Column simplified Chinese is in. Must be one of the existing columns in the input.",
      type: "number",
      default: 0,
      required: true
    })
    .option("measureWordColumn", {
      alias: ["m"],
      desc:
        "Column to put measure words in. Must be non-negative. If past the end, adds empty columns; else replaces the value at the column.",
      type: "number",
      required: true
    })
    .option("measureWordPinyinColumn", {
      alias: "p",
      desc:
        "Column to put measure word's pinyin in. Must be non-negative. If past the end, adds empty columns; else replaces the value at the column.",
      type: "number"
    })
    .option("measureWordEnglishColumn", {
      alias: "e",
      desc:
        "Column to put measure word's English description in. . If past the end, adds empty columns; else replaces the value at the column.",
      type: "number"
    })
    .option("inputFile", {
      alias: ["i"],
      desc: "Input file",
      type: "string",
      required: true
    })
    .option("outputFile", {
      alias: ["o"],
      desc: "Output file",
      type: "string",
      required: true
    })
    .help().argv;

  if (delimiter.length !== 1) {
    throw new Error(
      `delimiter must be of length 1, got one of length ${
        delimiter.length
      }. Value: "${delimiter}"`
    );
  }

  return {
    delimiter,
    chineseColumn,
    measureWordColumn,
    measureWordPinyinColumn,
    measureWordEnglishColumn,
    inputFile,
    outputFile
  };
}

/**
 * Fetches measure words from the file in this repo and returns it in an easily
 * consumable format.
 *
 * @returns {{[chineseCharacter]: { measureWord, measureWordPinyin, measureWordEnglishCategory }}}
 */
function getMeasureWords() {
  const measureWordsList = parseCsv(
    fs.readFileSync(path.join(".", "data", "classifiersAll.tsv"), "utf-8"),
    {
      delimiter: "\t"
    }
  );

  return measureWordsList.reduce((memo, line) => {
    const [
      chineseCharacter,
      measureWord,
      measureWordPinyin,
      measureWordEnglishCategory
    ] = line;
    return {
      ...memo,
      [chineseCharacter]: {
        measureWord,
        measureWordPinyin,
        measureWordEnglishCategory
      }
    };
  }, {});
}

function getInputNotes(inputFile, delimiter) {
  return parseCsv(fs.readFileSync(inputFile, "utf-8"), {
    delimiter
  });
}

function validateColumnArgs({
  numColumns,
  chineseColumn,
  measureWordColumn,
  measureWordPinyinColumn,
  measureWordEnglishColumn
}) {
  const requiredCols = ["chineseColumn", "measureWordColumn"];
  const measureWordCols = {
    measureWordColumn,
    measureWordPinyinColumn,
    measureWordEnglishColumn
  };
  const cols = { chineseColumn, ...measureWordCols };

  // ensure all are valid integers
  Object.keys(cols).forEach(field => {
    // skip undefined fields if they're allowed
    if (!requiredCols.includes(field) && !cols[field]) return;
    if (!Number.isInteger(cols[field])) {
      throw new Error(`${field} must be an integer; got ${cols[field]}`);
    }
  });

  // ensure chinese column is a valid one
  if (chineseColumn < 0 || chineseColumn >= numColumns) {
    throw new Error(
      `chineseColumn must be one of the existing columns in the input (from 0 to ${numColumns -
        1}); but got ${chineseColumn}`
    );
  }

  Object.keys(measureWordCols).forEach(field => {
    if (measureWordCols[field] < 0) {
      throw new Error(
        `${field} cannot be nonnegative, but received ${col[field]}`
      );
    }
  });
}

/**
 * Returns a new array, such that for each {column, value} pair in the toInsert
 * array, array[column] = value
 * if `column` is undefined, then doesn't do anything.
 */
function setValueAtColumn(array, toInsert) {
  return toInsert.reduce((curArray, { column, value }) => {
    if (column === 0 || !!column) {
      curArray[column] = value;
    }
    return curArray;
  }, Array.from(array));
}

function addMeasureWordsToNotes(
  chineseWordToMeasureWordMapping,
  inputNotes,
  chineseColumn,
  measureWordColumn,
  measureWordPinyinColumn,
  measureWordEnglishColumn
) {
  // mapping from key in chineseWordToMeasureWordMapping, to the column to
  // insert into
  const measureWordMapping = {
    measureWord: measureWordColumn,
    measureWordPinyin: measureWordPinyinColumn,
    measureWordEnglishCategory: measureWordEnglishColumn
  };
  let numEdited = 0;
  const outputNotes = inputNotes.map((note, index) => {
    if (!(note[chineseColumn] in chineseWordToMeasureWordMapping)) {
      console.warn(
        chalk.yellow(
          `Note for line ${index}, character ${
            note[chineseColumn]
          } does not have a measure word mapping; skipping`
        )
      );

      const colsToInsert = Object.keys(measureWordMapping).map(field => ({
        column: measureWordMapping[field],
        value: ""
      }));
      return setValueAtColumn(note, colsToInsert);
    }

    ++numEdited;
    const measureWordData =
      chineseWordToMeasureWordMapping[note[chineseColumn]];
    return setValueAtColumn(
      note,
      Object.keys(measureWordMapping).map(field => ({
        column: measureWordMapping[field],
        value: measureWordData[field]
      }))
    );
  });
  return { outputNotes, numEdited };
}

function main() {
  const {
    delimiter,
    chineseColumn,
    measureWordColumn,
    measureWordPinyinColumn,
    measureWordEnglishColumn,
    inputFile,
    outputFile
  } = getConsoleArgs();
  const chineseWordToMeasureWordMapping = getMeasureWords(delimiter);
  console.info(
    chalk.grey("Reading notes from"),
    chalk.bold(inputFile),
    chalk.grey("...")
  );
  const inputNotes = getInputNotes(inputFile, delimiter);
  console.info(chalk.green("Read notes successfully."));

  if (inputNotes.length === 0) {
    console.warn(chalk.yellow("No notes in the input file; aborting."));
    return;
  }

  validateColumnArgs({
    numColumns: inputNotes[0].length,
    chineseColumn,
    measureWordColumn,
    measureWordPinyinColumn,
    measureWordEnglishColumn
  });

  console.info(
    chalk.grey("Processing output of"),
    chalk.bold(chalk.grey(inputNotes.length)),
    chalk.grey("notes...")
  );
  const { outputNotes, numEdited } = addMeasureWordsToNotes(
    chineseWordToMeasureWordMapping,
    inputNotes,
    chineseColumn,
    measureWordColumn,
    measureWordPinyinColumn,
    measureWordEnglishColumn
  );
  console.info(
    chalk.green("Processed notes successfully; edited"),
    chalk.bold(chalk.green(numEdited)),
    chalk.green("notes.")
  );

  console.info(
    chalk.grey("Writing results to"),
    chalk.bold(outputFile),
    chalk.grey("...")
  );
  const outputContent = stringifyCsv(outputNotes);
  fs.writeFileSync(outputFile, outputContent);
  console.info(
    chalk.bold(chalk.green("Outputted results successfully. Script complete!"))
  );
}

try {
  main();
} catch (e) {
  console.error(chalk.red(chalk.bold(e.message)));
  console.error("Aborting.");
  throw e;
}
