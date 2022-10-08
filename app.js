const express = require("express");
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js"); // Our own module
const mongoose = require('mongoose');
const _ = require("lodash");

const app = express();
const port = process.env.PORT || 3000;

const items = [];
const workItems = [];

app.set('view engine', 'ejs'); // EJS templating

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.listen(port, () => {
    console.log("Server started on port: "+ port);
});

main().catch(err => console.log(err));

async function main() {
    let dbName = "todoListDB";

    // connecting to local db
    // await mongoose.connect('mongodb://localhost:27017/todoListDB');

    // connecting to hosted db (MongoDB Atlas)
    await mongoose.connect("mongodb+srv://" + process.env.MONGODB_ADMIN_USER + ":" + process.env.MONGODB_ADMIN_PASS + "@cluster0.vekgroy.mongodb.net/?retryWrites=true&w=majority/" + dbName);
};

/***********
 * ToDo item
***********/

/**
 * create a SCHEMA that sets out the fields each document will have and their datatypes and validations.
 **/
// todoItem schema
const todoItemSchema = new mongoose.Schema({
    name: {
        type: String, // Datatype
        required: [true, "A todo item without name cannot exist. Please check your entry and try again."] // Validation
    },
});

/**
 * create a MODEL. A model is a class with which we construct documents. In this case, each document will be a ToDoItem with properties(and behaviors) as declared in our schema.
 */
const ToDoItem = mongoose.model("ToDoItem", todoItemSchema);

/*********
 * List
 *********/

// list schema
const listSchema = new mongoose.Schema({
    name: String,
    items: [todoItemSchema]
});

const List = mongoose.model("List", listSchema);

// Home (root) route
app.get("/", (req, res) => {
    // Default list (Today). The default list has no association (i.e default list's todo items are not associated to any list)
    ToDoItem.find((err, todoItems) => {
        if (err) {
            console.log(err);
        }
        else {
            res.render("list", {listTitle: "Today", newListItems: todoItems});

            // close the connection after work is done.
            // mongoose.connection.close();
        }
    });
});

app.get('/favicon.ico', function(req, res) {
    res.status(204);
    res.end();
});

// Route params
app.get("/:customListName", (req, res) => {
    const customListName = _.capitalize(req.params.customListName); // capitalize first character
    
    // Find the list with customListName. If it doesn't exists, only then create a new one.
    List.findOne({name: customListName}, (err, foundList) => {
        if (err) {
            console.log(err);
        }
        else {
            if (!foundList) {
                const list = new List ({
                    name: customListName,
                    items: []
                });
            
                list.save();
                res.redirect("/" + customListName);
            }
            else {
                res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
            }
        }
    });
});

app.post("/", (req, res) => {
    const itemName = req.body.newItem;
    const listName = req.body.list;
    
    const item = new ToDoItem({
        name: itemName
    });

    // For default list (Today), directly update the item
    if (listName === "Today") {
        item.save();
        res.redirect("/");
    }
    // Otherwise get the required list and update corresponding items
    else {
        List.findOne({name: listName}, (err, foundList) => {
            foundList.items.push(item);
            foundList.save();
            res.redirect("/" + listName);
        });
    }
});

app.post("/delete", (req, res) => {
    const idToDelete = req.body.checkItem;
    const listName = req.body.listName;

    if (listName === "Today") {
        ToDoItem.findByIdAndRemove(idToDelete, (err) => {
            if (err) {
                console.log(err);
            }
            else {
                console.log("Successfully deleted the todo item");
            }
            res.redirect("/");
        });
    }
    else {
        // Find the list and delete the corresponding item
        List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: idToDelete}}}, (err, foundList) => {
            if (err) {
                console.log(err);
            }
            else {
                res.redirect("/" + listName);
            }
        });
    }
});

app.get("/about", (req, res) => {
    res.render("about");
});