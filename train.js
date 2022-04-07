import * as THREE from "three";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
import * as tf from "@tensorflow/tfjs-node";
import _ from "lodash";

// import model from "./model.js";

const model = tf.sequential();
model.add(tf.layers.dense({ inputShape: [7], units: 20, activation: "relu" }));
model.add(tf.layers.dense({ units: 20, activation: "relu" }));
model.add(tf.layers.dense({ units: 8 }));
model.compile({ optimizer: "adam", loss: "meanSquaredError" });

const targetModel = tf.sequential();
targetModel.add(
	tf.layers.dense({ inputShape: [7], units: 20, activation: "relu" })
);
targetModel.add(tf.layers.dense({ units: 20, activation: "relu" }));
targetModel.add(tf.layers.dense({ units: 8 }));
targetModel.compile({ optimizer: "adam", loss: "meanSquaredError" });
targetModel.setWeights(model.getWeights());
//Initializing score
let score = 0;

const finishPosition = new CANNON.Vec3(-20, 1, -20);

// Initializing CANNON
const world = new CANNON.World();
world.gravity.set(0, -10, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 40;

const wheelMaterial = new CANNON.Material("wheelMaterial");

const floorBodyMaterial = new CANNON.Material("floorBodyMaterial");

const obstacleMaterial = new CANNON.Material("obstacleMaterial");

//Wheel Ground Contact

const wheelGroundContactMaterial = new CANNON.ContactMaterial(
	wheelMaterial,
	floorBodyMaterial,
	{
		friction: 0.3,
		restitution: 0,
		contactEquationStiffness: 1000,
	}
);
world.addContactMaterial(wheelGroundContactMaterial);

const wheelObstacleContactMaterial = new CANNON.ContactMaterial(
	wheelMaterial,
	obstacleMaterial,
	{
		friction: 0.3,
		restitution: 0,
		contactEquationStiffness: 1000,
	}
);
world.addContactMaterial(wheelObstacleContactMaterial);

//Make car
const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const chassisBody = new CANNON.Body({ mass: 150, linearDamping: 0.5 });
chassisBody.addShape(chassisShape);
chassisBody.position.set(0, 1, 0);
chassisBody.quaternion.set(0, 0, 0, 1);
chassisBody.angularVelocity.set(0, 0, 0);

world.addBody(chassisBody);

const vehicle = new CANNON.RaycastVehicle({
	chassisBody,
	indexRightAxis: 0,
	indexUpAxis: 1,
	indexForwardAxis: 2,
});

const wheelOptions = {
	radius: 0.5,
	directionLocal: new CANNON.Vec3(0, -1, 0),
	suspensionStiffness: 30,
	suspensionRestLength: 0.3,
	frictionSlip: 5,
	dampingRelaxation: 2.3,
	dampingCompression: 4.4,
	maxSuspensionForce: 100000,
	rollInfluence: 0.01,
	axleLocal: new CANNON.Vec3(-1, 0, 0),
	chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
	maxSuspensionTravel: 0.3,
	customSlidingRotationalSpeed: -30,
	useCustomSlidingRotationalSpeed: true,
};

wheelOptions.chassisConnectionPointLocal.set(1, 0, -1);
vehicle.addWheel(wheelOptions);

wheelOptions.chassisConnectionPointLocal.set(-1, 0, -1);
vehicle.addWheel(wheelOptions);

wheelOptions.chassisConnectionPointLocal.set(1, 0, 1);
vehicle.addWheel(wheelOptions);

wheelOptions.chassisConnectionPointLocal.set(-1, 0, 1);
vehicle.addWheel(wheelOptions);

vehicle.addToWorld(world);

const wheelBodies = [];
vehicle.wheelInfos.forEach(wheel => {
	const cylinderShape = new CANNON.Cylinder(
		wheel.radius,
		wheel.radius,
		wheel.radius / 2,
		20
	);
	const wheelBody = new CANNON.Body({
		mass: 10,
		material: wheelMaterial,
		// angularDamping: 0.5,
	});
	wheelBody.type = CANNON.Body.KINEMATIC;
	wheelBody.collisionFilterGroup = 0; // turn off collisions
	let q = new CANNON.Quaternion();
	q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
	wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);

	wheelBodies.push(wheelBody);
	world.addBody(wheelBody);
});

world.addEventListener("postStep", () => {
	for (let i = 0; i < vehicle.wheelInfos.length; i++) {
		vehicle.updateWheelTransform(i);
		const transform = vehicle.wheelInfos[i].worldTransform;
		const wheelBody = wheelBodies[i];
		wheelBody.position.copy(transform.position);
		wheelBody.quaternion.copy(transform.quaternion);
	}
});

//Add obstacles

// const obstacles = [];

// for (let i = 0; i < 20; i++) {
// 	const obstacleShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1));
// 	const obstacleMass = 2;
// 	const obstacleBody = new CANNON.Body({
// 		mass: obstacleMass,
// 		material: obstacleMaterial,
// 		shape: obstacleShape,
// 	});
// 	const xSign = Math.round(Math.random()) ? 1 : -1;
// 	const zSign = Math.round(Math.random()) ? 1 : -1;

// 	const xPosition = (Math.random() * 30 + 10) * xSign;
// 	const zPosition = (Math.random() * 30 + 10) * zSign;

// 	obstacleBody.position.set(xPosition, 10, zPosition);

// 	world.addBody(obstacleBody);
// 	obstacles.push(obstacleBody);
// }

//Using heightfield

let matrix = [];
let sizeX = 64,
	sizeY = 64;

for (let i = 0; i < sizeX; i++) {
	matrix.push([]);
	for (var j = 0; j < sizeY; j++) {
		matrix[i].push(0);
	}
}

var hfShape = new CANNON.Heightfield(matrix, {
	elementSize: 100 / sizeX,
});
var hfBody = new CANNON.Body({ mass: 0, material: floorBodyMaterial });
hfBody.addShape(hfShape);
hfBody.position.set(
	(-sizeX * hfShape.elementSize) / 2,
	0,
	(sizeY * hfShape.elementSize) / 2
);
hfBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(hfBody);

const reset = () => {
	// const xSign = Math.round(Math.random()) ? 1 : -1;
	// const zSign = Math.round(Math.random()) ? 1 : -1;

	// const xPosition = Math.random() * 20 * xSign;
	// const zPosition = Math.random() * 20 * zSign;

	// chassisBody.position.set(xPosition, 1, zPosition);
	chassisBody.position.set(0, 1, 0);
	chassisBody.quaternion.set(0, 0, 0, 1);
	chassisBody.angularVelocity.set(0, 0, 0);
	chassisBody.velocity.setZero();

	vehicle.applyEngineForce(0, 0);
	vehicle.applyEngineForce(0, 1);
	vehicle.applyEngineForce(0, 2);
	vehicle.applyEngineForce(0, 3);

	vehicle.setBrake(0, 0);
	vehicle.setBrake(0, 1);
	vehicle.setBrake(0, 2);
	vehicle.setBrake(0, 3);

	vehicle.setSteeringValue(0, 0);
	vehicle.setSteeringValue(0, 1);
};

function updatePhysics() {
	if (chassisBody.position.y < 0) {
		reset();
	}
	world.step(1 / 60);
}

const EPISODES = 100;
const EPSILON_START = 0.5;
const EPSILON_DECAY = 0.9999;
const MIN_EPSILON = 0.01;
const DISCOUNT = 0.99;
const MIN_REPLAY_MEMORY_SIZE = 1000;
const MINIBATCH_SIZE = 100;
const REPLAY_MEMORY_SIZE = 50000;
const EPISODE_LENGTH = 5000;
const UPDATE_FREQUENCY = 100;

let epsilon = EPSILON_START;
let epoch = 1;
let episode = 1;
let move = 1;

const replayMemory = [];

async function consoleMemory() {
	const size = replayMemory.length >= 3000 ? 3000 : replayMemory.length;
	const sumRewards = replayMemory.slice(-1 * size).reduce((acc, memory) => {
		acc += memory[2];
		return acc;
	}, 0);
	const completes = replayMemory.slice(-1 * size).reduce((acc, memory) => {
		if (memory[4]) {
			acc++;
		}
		return acc;
	}, 0);
	const averageReward = sumRewards / size;
	console.log(
		`\nepisode: ${episode} | avg_reward: ${averageReward} | completes: ${completes} | ending epsilon: ${epsilon}`
	);
	await model.save(
		`file:///Users/tonyfu/threeJs/myGame/models/v15/my-model-episode-${episode}-nodejs`
	);
}

const train = async function () {
	if (epoch % UPDATE_FREQUENCY === 0) {
		// console.log("model updated");
		model.setWeights(targetModel.getWeights());
	}

	if (move < MIN_REPLAY_MEMORY_SIZE) {
		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write(`move: ${move}`);
	}

	if (epoch >= EPISODE_LENGTH) {
		await consoleMemory();
		reset();
		episode++;
		epoch = 1;
		// epsilon = EPSILON_START;
		// console.log("model updated");
		model.setWeights(targetModel.getWeights());
	}

	const currentState = [
		chassisBody.position.x / 50,
		chassisBody.position.y / 50,
		chassisBody.position.z / 50,
		chassisBody.velocity.x / 17,
		chassisBody.velocity.z / 17,
		chassisBody.quaternion.x,
		chassisBody.quaternion.z,
	];

	const state = tf.tensor2d(currentState, [1, currentState.length]);

	const actionSet = [
		// "left",
		// "right",
		"left-forward",
		"left-backward",
		"right-forward",
		"right-backward",
		"forward",
		"backward",
		"brake",
		"nothing",
	];

	// console.log(currentState);
	// state.print();
	// console.log(state);
	let useNetwork = true;
	if (Math.random() < epsilon) {
		useNetwork = false;
		// console.log(`making random move (epsilon = ${epsilon})`);
	}

	const preds = model.predict(state);
	state.dispose();

	const predsArr = preds.dataSync();
	// console.log("preds");
	// preds.print();
	preds.dispose();

	const actionIndex = useNetwork
		? predsArr.indexOf(Math.max(...predsArr))
		: Math.floor(Math.random() * 6);

	const action = actionSet[actionIndex];
	// console.log("action", action);

	switch (action) {
		// case "left":
		// 	vehicle.setSteeringValue(0.5, 0);
		// 	vehicle.setSteeringValue(0.5, 1);
		// 	break;
		// case "right":
		// 	vehicle.setSteeringValue(-0.5, 0);
		// 	vehicle.setSteeringValue(-0.5, 1);
		// 	break;
		case "left-forward":
			vehicle.setSteeringValue(0.5, 0);
			vehicle.setSteeringValue(0.5, 1);
			vehicle.applyEngineForce(500, 0);
			vehicle.applyEngineForce(500, 1);
			vehicle.applyEngineForce(500, 2);
			vehicle.applyEngineForce(500, 3);
			break;
		case "right-forward":
			vehicle.setSteeringValue(-0.5, 0);
			vehicle.setSteeringValue(-0.5, 1);
			vehicle.applyEngineForce(500, 0);
			vehicle.applyEngineForce(500, 1);
			vehicle.applyEngineForce(500, 2);
			vehicle.applyEngineForce(500, 3);
			break;
		case "left-backward":
			vehicle.setSteeringValue(0.5, 0);
			vehicle.setSteeringValue(0.5, 1);
			vehicle.applyEngineForce(-500, 0);
			vehicle.applyEngineForce(-500, 1);
			vehicle.applyEngineForce(-500, 2);
			vehicle.applyEngineForce(-500, 3);
			break;
		case "right-backward":
			vehicle.setSteeringValue(-0.5, 0);
			vehicle.setSteeringValue(-0.5, 1);
			vehicle.applyEngineForce(-500, 0);
			vehicle.applyEngineForce(-500, 1);
			vehicle.applyEngineForce(-500, 2);
			vehicle.applyEngineForce(-500, 3);
			break;
		case "forward":
			vehicle.setSteeringValue(0, 0);
			vehicle.setSteeringValue(0, 1);
			vehicle.applyEngineForce(500, 0);
			vehicle.applyEngineForce(500, 1);
			vehicle.applyEngineForce(500, 2);
			vehicle.applyEngineForce(500, 3);
			break;
		case "backward":
			vehicle.setSteeringValue(0, 0);
			vehicle.setSteeringValue(0, 1);
			vehicle.applyEngineForce(-500, 0);
			vehicle.applyEngineForce(-500, 1);
			vehicle.applyEngineForce(-500, 2);
			vehicle.applyEngineForce(-500, 3);
			break;
		case "brake":
			vehicle.setBrake(50, 0);
			vehicle.setBrake(50, 1);
			vehicle.setBrake(50, 2);
			vehicle.setBrake(50, 3);
			break;
		case "nothing":
			vehicle.applyEngineForce(0, 0);
			vehicle.applyEngineForce(0, 1);
			vehicle.applyEngineForce(0, 2);
			vehicle.applyEngineForce(0, 3);
			vehicle.setBrake(0, 0);
			vehicle.setBrake(0, 1);
			vehicle.setBrake(0, 2);
			vehicle.setBrake(0, 3);
			vehicle.setSteeringValue(0, 0);
			vehicle.setSteeringValue(0, 1);
			break;
	}

	updatePhysics();

	move++;

	let done = false;

	let reward = (142 - chassisBody.position.distanceTo(finishPosition)) / 200;

	if (chassisBody.position.distanceTo(finishPosition) < 1.3) {
		reward = 1;
		done = true;
		score++;
		console.log("finished!");
	}

	// console.log("distance", chassisBody.position.distanceTo(finishPosition));
	// console.log("reward", reward);

	const newCurrentState = [
		chassisBody.position.x / 50,
		chassisBody.position.y / 50,
		chassisBody.position.z / 50,
		chassisBody.velocity.x / 17,
		chassisBody.velocity.z / 17,
		chassisBody.quaternion.x,
		chassisBody.quaternion.z,
	];

	if (replayMemory.length >= REPLAY_MEMORY_SIZE) {
		replayMemory.shift();
	}

	replayMemory.push([currentState, actionIndex, reward, newCurrentState, done]);

	// console.log("memory length", replayMemory.length);

	if (epsilon !== MIN_EPSILON) {
		epsilon = Math.max(MIN_EPSILON, epsilon * EPSILON_DECAY);
	}
	//MIN_REPLAY_MEMORY_SIZE
	if (replayMemory.length < MIN_REPLAY_MEMORY_SIZE) {
		// console.log("memory length", replayMemory.length);
		return;
	}

	const miniBatch = _.sampleSize(replayMemory, MINIBATCH_SIZE);

	const currentStates = [];

	const updatedQs = [];

	miniBatch.forEach(([state, action, reward, nextState, done], index) => {
		currentStates.push(state);

		const x = tf.tensor2d(state, [1, 7]);
		const currentQ = model.predict(x);

		// const newState = tf.tensor2d(nextState, [1, 7]);
		// const futureQ = targetModel.predict(newState);

		const currentQData = currentQ.dataSync();

		// currentQData[action] = !done
		// 	? reward + DISCOUNT * futureQ.max().dataSync()
		// 	: reward;

		currentQData[action] = reward;

		updatedQs.push(currentQData);

		x.dispose();
		// newState.dispose();
		currentQ.dispose();
		// futureQ.dispose();
	});

	const X = tf.tensor2d(currentStates);

	const y = tf.tensor2d(updatedQs, [MINIBATCH_SIZE, actionSet.length]);

	process.stdout.clearLine();
	process.stdout.cursorTo(0);
	process.stdout.write(
		`epoch: ${epoch} | reward: ${reward} | epsilon: ${epsilon}`
	);

	// console.log(miniBatch[0]);
	// console.log("updatedQs", updatedQs);
	// console.log(currentState);
	// console.log(currentStates);

	// X.print();
	// y.print();

	await targetModel.fit(X, y, { verbose: false });
	// console.log("trained!");

	epoch++;

	if (done) {
		await consoleMemory();
		reset();
		epoch = 0;
		episode++;
		// epsilon = EPSILON_START;
		// console.log("model updated");
		model.setWeights(targetModel.getWeights());
	}

	X.dispose();
	y.dispose();
};

console.log("Begins training");

// let i = 0;
// while (i < 100) {
// 	await train();
// 	i++;
// }

while (true) {
	await train();
}
