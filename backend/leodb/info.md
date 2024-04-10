# LeoDB - A simple, in-memory database by Max Seebacher © 2024
## Version 1.0.0

LeoDB is a simple, in-memory database that supports basic CRUD operations and can save and load data from a .db file. The database stores records as objects, and each record has a unique id field. Records are stored in an array. The database supports the following operations:
- Create: Add a new record to the database.
- Read: Retrieve records from the database based on query criteria.
- Update: Modify records in the database based on query criteria.
- Delete: Remove records from the database based on query criteria.
- SaveToFile: Save the database to a .db file.
- LoadFromFile: Load the database from a .db file. The database supports basic filtering based on query criteria.

Following query options are available:
- gte - greater than or equal to, example age: { $gte: 30 } to get all records with age greater than or equal to 30
- lte - less than or equal to, example age: { $lte: 40 } to get all records with age less than or equal to 40
- gt - greater than, example age: { $gt: 30 } to get all records with age greater than 30
- lt - less than, example age: { $lt: 40 } to get all records with age less than 40
- param: value, example age: 35 to get all records with age 35
- ne - not equal to, example age: { $ne: 35 } to get all records with age not equal to 35
- in - in, example age: { $in: [30, 40, 50] } to get all records with age in [30, 40, 50]
- nin - not in, example age: { $nin: [30, 40, 50] } to get all records with age not in [30, 40, 50]
- exists - exists, example age: { $exists: true } to get all records where age field exists
- regex - regular expression, example name: { $regex: '^J' } to get all records with names starting with 'J'