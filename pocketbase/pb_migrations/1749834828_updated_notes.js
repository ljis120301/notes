/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3395098727")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\" || isPublic = true",
    "viewRule": "@request.auth.id != \"\" || isPublic = true"
  }, collection)

  // remove the unused publicID field since we're using the note's existing ID for sharing
  collection.fields.removeById("text845756765")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3395098727")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  }, collection)

  // add back the publicID field if rolling back
  collection.fields.addAt(9, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text845756765",
    "max": 0,
    "min": 0,
    "name": "publicID",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": false,
    "system": false,
    "type": "text"
  }))

  return app.save(collection)
})
