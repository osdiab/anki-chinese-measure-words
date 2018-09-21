# add-measure-words

Adds measure words to existing Anki cards, as exported in `tsv` format by the
Anki desktop program.

It does this by checking which ones of your cards matches exactly a word from
the classifiers list [in this Github
repo](https://github.com/morloy/ChineseResources),
and adds it to the specified column (or to the end if none is specified).

## Usage

### Getting the data to work with

You can use this with data directly from Anki, or before adding to Anki, use
it on a `csv` or `tsv` you want to import.

If you're getting it from Anki, do the following to get the data in a format
this program can read.

1. Open Anki
1. Click `File->Export`
1. Set `Export Format` to `Notes in Plain Text`
1. Set `Include` to the decks you want to include.
1. Export it to a file.

#### Troubleshooting exporting

The script will fail in the following conditions:

##### You're using traditional characters

Sorry, but this is still too dumb to deal with that. Shouldn't be hard to add
support for, though.

##### There are multiple note types with different fields

This is a dumb script and doesn't have a way to distinguish between note types
that have different numbers of fields; and also do the same operation on
multiple note types if they have the same number of fields.

If it errors out saying that there are fields with the wrong number of columns,
good chance it's because of this; I would go through the exported file in Anki
and delete the lines you don't want to generate measure word cards for.

##### There are newlines in fields in your cards

This will cause some notes to end up with multiple rows that have the wrong
number of columns, and thus the script will break. I don't have a good solution
for this at the moment, besides making them not have newlines, or removing them
from being processed.

### On your computer, assuming you have technical skill

This is a script you need to run from your terminal; maybe in the future I'll
turn this into a website or something, but for now, these are the instructions:

1. Install `node`.
1. Clone this repository with `git`.
1. `cd` into this directory.
1. Run `npm install`.
1. Run `npm start`. It will fail because you need to supply arguments.
1. Follow the usage instructions to supply the correct arguments, and output
   a new tab-delimited file you can import into Anki. You can supply arguments
   like so: `npm start -- -i path/to/input -o path/to/output ...`

A file you can import back into Anki should now be available; select the proper
columns when you reimport back in (or suffer the consequences). To do so:

1. Open Anki
1. Ensure your deck already has Fields for the note type that you want the
   measure words to be added to
1. Click `File->Import`
1. Choose the proper deck to insert to, and note type with the measure word
   fields
1. Set the dropdown to "Update existing notes when first field matches"
   (assuming the first field is a good field to match on for your cards)
1. Choose the correct Anki note fields to map to the added measure word fields
1. Pray that it imports properly

## Credits

`data/classifiersAll.tsv` comes from https://github.com/morloy/ChineseResources.
Thanks for providing this useful list!
