import * as tf from "@tensorflow/tfjs-node";

const actionModel = tf.sequential();
actionModel.add(
	tf.layers.dense({ inputShape: [7], units: 20, activation: "relu" })
);
actionModel.add(tf.layers.dense({ units: 20, activation: "relu" }));
actionModel.add(tf.layers.dense({ units: 5 }));
actionModel.compile({ optimizer: "adam", loss: "meanSquaredError" });

//Q model
const qModel = tf.sequential();
qModel.add(tf.layers.dense({ inputShape: [7], units: 20, activation: "relu" }));
qModel.add(tf.layers.dense({ units: 20, activation: "relu" }));
qModel.add(tf.layers.dense({ units: 5 }));
qModel.compile({ optimizer: "adam", loss: "meanSquaredError" });

export { actionModel, qModel };
