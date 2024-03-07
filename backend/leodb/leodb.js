const fs = require("fs");

class LeoDB {
  constructor() {
    this.data = [];
    this.filePath = null;
    this.nextId = 1;
  }

  // Create operation
  create(record) {
    record.id = this.nextId; // Assign a unique ID to the record
    this.data.push(record);
    this.nextId = this.nextId + 1; // increment the nextId
    console.log("DEBUG: Current ID: "+record.id+", Next ID: "+this.nextId);
  }

  // Read operation
  read(query) {
    return this.data.filter((record) => {
      for (let key in query) {
        if (typeof query[key] === "object") {
          const queryValue = query[key];
          if (
            "$gte" in queryValue ||
            "$lte" in queryValue ||
            "$gt" in queryValue ||
            "$lt" in queryValue
          ) {
            const { $gte, $lte, $gt, $lt } = queryValue;
            if (
              ($gte !== undefined && record[key] < $gte) ||
              ($lte !== undefined && record[key] > $lte) ||
              ($gt !== undefined && record[key] <= $gt) ||
              ($lt !== undefined && record[key] >= $lt)
            ) {
              return false;
            }
          } else if ("$ne" in queryValue) {
            if (record[key] === queryValue["$ne"]) {
              return false;
            }
          } else if ("$in" in queryValue) {
            if (!queryValue["$in"].includes(record[key])) {
              return false;
            }
          } else if ("$nin" in queryValue) {
            if (queryValue["$nin"].includes(record[key])) {
              return false;
            }
          } else if ("$exists" in queryValue) {
            if (queryValue["$exists"] && record[key] === undefined) {
              return false;
            } else if (!queryValue["$exists"] && record[key] !== undefined) {
              return false;
            }
          } else if ("$regex" in queryValue) {
            const regex = new RegExp(queryValue["$regex"]);
            if (!regex.test(record[key])) {
              return false;
            }
          }
        } else if (query[key] instanceof RegExp) {
          if (!query[key].test(record[key])) {
            return false;
          }
        } else if (query[key] !== record[key]) {
          return false;
        }
      }
      return true;
    });
  }

  // Update operation
  update(query, updates) {
    this.data.forEach((record) => {
      // Check if the record matches the query criteria
      let matchesQuery = true;
      for (let key in query) {
        if (record[key] !== query[key]) {
          matchesQuery = false;
          break;
        }
      }
      // If the record matches the query, apply updates
      if (matchesQuery) {
        for (let key in updates) {
          record[key] = updates[key];
        }
      }
    });
  }

  delete(query) {
    let found = false;
    for (let i = 0; i < this.data.length; i++) {
      let record = this.data[i];
      let match = true;
      for (let key in query) {
        if (record[key] != query[key]) {
          match = false;
          break;
        }
      }
      if (match) {
        // Remove the matching record from the array
        this.data.splice(i, 1);
        found = true;
        break; // Exit loop after deletion
      }
    }
    console.log("DEBUG: Query: "+query);
  
    if(found){
      console.log("DEBUG: Filepath: "+this.filePath);
      if (this.filePath != null) {
        this.saveToFile(this.filePath);
        return true;
      }else{
        return false;
      }
    }else{
      return false;
    }
  }  

  // Delete all operation
  deleteAll() {
    this.data = [];
  }

  // Save database to a .db file
  saveToFile(filePath) {
    // Write data and next id to the specified file path
    const dataToSave = JSON.stringify({ data: this.data, nextId: this.nextId });
    fs.writeFileSync(filePath, dataToSave);
  }

  // Load database from a .db file
  loadFromFile(filePath) {
    // Read data and next id from the specified file path
    const dataFromFile = fs.readFileSync(filePath, "utf8");
    const parsedData = JSON.parse(dataFromFile);
    this.data = parsedData.data;
    this.nextId = parsedData.nextId;
    this.filePath = filePath;
  }
}

module.exports = LeoDB;
