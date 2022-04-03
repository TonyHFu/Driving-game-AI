const model = tf.sequential();
model.add(tf.layers.dense({ inputShape: [7], units: 20, activation: "relu" }));
model.add(tf.layers.dense({ units: 20, activation: "relu" }));
model.add(tf.layers.dense({ units: 6 }));
model.compile({ optimizer: "adam", loss: "meanSquaredError" });

export default model;
