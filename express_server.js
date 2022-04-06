import express from "express";

var PORT = process.env.PORT || 8000;

var app = express();

app.use(express.static("public"));

app.listen(8000, () => {
	console.log(`Listening on port ${PORT}`);
});
