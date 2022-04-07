import * as THREE from "./vendor/three.module.js";
// import { OrbitControls } from "./vendor/OrbitControls.js";
import * as CANNON from "./vendor/cannon-es.js";
import CannonDebugger from "./vendor/cannon-es-debugger.js";

//Initializing score
let score = 0;
// Initializing THREE JS
const scene = new THREE.Scene();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(10, 20, 0);
scene.add(directionalLight);

const fov = 60;
const aspect = window.innerWidth / window.innerHeight;
const near = 1.0;
const far = 1000.0;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

camera.position.set(4, 4, 4);
camera.lookAt(0, 0, 0);

//Adding finish point

const finishGeometry = new THREE.CylinderGeometry(1, 1, 2, 20);
const finishMaterial = new THREE.MeshBasicMaterial({
	color: 0xffff00,
	opacity: 0.5,
	transparent: true,
});
const finish = new THREE.Mesh(finishGeometry, finishMaterial);

finish.position.set(-20, 1, -20);
scene.add(finish);

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

//Make box

// const geometry = new THREE.BoxGeometry(3, 1, 3);
// const material = new THREE.MeshLambertMaterial({ color: 0xfb8e00 });
// const mesh = new THREE.Mesh(geometry, material);
// mesh.position.set(0, 5, 0);
// scene.add(mesh);

// const shape = new CANNON.Box(new CANNON.Vec3(1.5, 0.5, 1.5));
// const mass = 5;
// const boxBodyMaterial = new CANNON.Material();
// const body = new CANNON.Body({ mass, shape, material: boxBodyMaterial });
// body.position.set(0, 5, 0);
// world.addBody(body);

//Make car
const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
const chassisBody = new CANNON.Body({ mass: 150, linearDamping: 0.5 });
chassisBody.addShape(chassisShape);
chassisBody.position.set(0, 1, 0);
chassisBody.quaternion.set(0, 0, 0, 1);
chassisBody.angularVelocity.set(0, 0, 0);

//giving chassisBody a 3mesh to deal with following camera

// const geometry = new THREE.BoxGeometry(1, 0.5, 2);
// const material = new THREE.MeshLambertMaterial({ color: 0xfb8e00 });
// const mesh = new THREE.Mesh(geometry, material);
// mesh.position.set(0, 1, 0);

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

//Adding marker of car position

const markerGeometry = new THREE.SphereGeometry(0.1, 32, 16);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const marker = new THREE.Mesh(markerGeometry, markerMaterial);
marker.position.copy(chassisBody.position);
scene.add(marker);

//adding marker to finish position
const finishMarkerGeometry = new THREE.SphereGeometry(0.1, 32, 16);
const finishMarkerMaterial = new THREE.MeshBasicMaterial({
	color: 0xff0000,
});
const finishMarker = new THREE.Mesh(finishMarkerGeometry, finishMarkerMaterial);
finishMarker.position.copy(finish.position);
scene.add(finishMarker);

// Using plane as floor

// const floorShape = new CANNON.Plane();
// const floorBody = new CANNON.Body({
// 	mass: 0,
// 	shape: floorShape,
// });
// floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
// floorBody.position.set(0, 0, 0);
// world.addBody(floorBody);

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

////Rendering

const debugRenderer = new CannonDebugger(scene, world);

// const renderer = new THREE.WebGL1Renderer({ antialias: true });
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.render(scene, camera);

const reset = () => {
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

// renderer.setAnimationLoop(animation);

document.body.appendChild(renderer.domElement);

//Event listeners

// document.addEventListener("keydown", event => {
// 	// console.log(event.code);
// 	if (event.code === "KeyW") {
// 		vehicle.applyEngineForce(500, 0);
// 		vehicle.applyEngineForce(500, 1);
// 		vehicle.applyEngineForce(500, 2);
// 		vehicle.applyEngineForce(500, 3);
// 	}
// 	if (event.code === "KeyS") {
// 		vehicle.applyEngineForce(-500, 0);
// 		vehicle.applyEngineForce(-500, 1);
// 		vehicle.applyEngineForce(-500, 2);
// 		vehicle.applyEngineForce(-500, 3);
// 	}

// 	if (event.code === "KeyA") {
// 		vehicle.setSteeringValue(0.5, 0);
// 		vehicle.setSteeringValue(0.5, 1);
// 	}
// 	if (event.code === "KeyD") {
// 		vehicle.setSteeringValue(-0.5, 0);
// 		vehicle.setSteeringValue(-0.5, 1);
// 	}

// 	if (event.code === "KeyQ") {
// 		vehicle.setBrake(50, 0);
// 		vehicle.setBrake(50, 1);
// 		vehicle.setBrake(50, 2);
// 		vehicle.setBrake(50, 3);
// 	}
// });

// document.addEventListener("keyup", event => {
// 	// console.log("key up");

// 	if (event.code === "KeyW") {
// 		vehicle.applyEngineForce(0, 0);
// 		vehicle.applyEngineForce(0, 1);
// 		vehicle.applyEngineForce(0, 2);
// 		vehicle.applyEngineForce(0, 3);
// 	}
// 	if (event.code === "KeyS") {
// 		vehicle.applyEngineForce(0, 0);
// 		vehicle.applyEngineForce(0, 1);
// 		vehicle.applyEngineForce(0, 2);
// 		vehicle.applyEngineForce(0, 3);
// 	}

// 	if (event.code === "KeyQ") {
// 		vehicle.setBrake(0, 0);
// 		vehicle.setBrake(0, 1);
// 		vehicle.setBrake(0, 2);
// 		vehicle.setBrake(0, 3);
// 	}

// 	if (event.code === "KeyA" || event.code === "KeyD") {
// 		vehicle.setSteeringValue(0, 0);
// 		vehicle.setSteeringValue(0, 1);
// 	}
// });

const onResize = () => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
};
window.addEventListener("resize", onResize);

document.getElementById("reset").addEventListener("click", reset);

function updatePhysics() {
	if (chassisBody.position.y < 0) {
		reset();
	}
	world.step(1 / 60);
	const idealOffSet = new THREE.Vector3(0, 12, 15);
	idealOffSet.applyQuaternion(chassisBody.quaternion);
	idealOffSet.add(chassisBody.position);
	camera.position.lerp(idealOffSet, 0.1);

	const idealLookAt = new THREE.Vector3(0, 0, -10);
	idealLookAt.applyQuaternion(chassisBody.quaternion);
	idealLookAt.add(chassisBody.position);

	camera.lookAt(idealLookAt);
	// mesh.position.copy(body.position);

	marker.position.copy(chassisBody.position);
}

document
	.getElementById("model_submit")
	.addEventListener("click", async function (event) {
		const uploadJSONInput = document.getElementById("upload-json");
		const uploadWeightsInput = document.getElementById("upload-weights");

		const model = await tf.loadLayersModel(
			tf.io.browserFiles([
				uploadJSONInput.files[0],
				uploadWeightsInput.files[0],
			])
		);

		reset();

		const EPISODES = 100;
		let epsilon = 0.5;
		const EPSILON_DECAY = 0.9999;
		const MIN_EPSILON = 0.01;
		const DISCOUNT = 0.99;
		const MIN_REPLAY_MEMORY_SIZE = 1000;
		const MINIBATCH_SIZE = 10;
		const REPLAY_MEMORY_SIZE = 50000;
		let epoch = 1;
		let episode = 1;
		let move = 1;

		// import * as tf from "@tensorflow/tfjs-node";

		const replayMemory = [];

		const train = async function () {
			console.log("move:", move);
			// if (epoch >= 3000) {
			// 	await model.save(`downloads://my-model-episode-${episode}-v4`);
			// 	reset();
			// 	episode++;
			// 	epoch = 1;
			// 	epsilon = 0.5;
			// }

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

			// let useNetwork = true;
			// if (Math.random() < epsilon) {
			// 	useNetwork = false;
			// 	console.log(`making random move (epsilon = ${epsilon})`);
			// }

			const preds = model.predict(state);
			state.dispose();

			const predsArr = preds.dataSync();
			// console.log("preds");
			// preds.print();
			preds.dispose();

			const actionIndex = predsArr.indexOf(Math.max(...predsArr));

			const action = actionSet[actionIndex];
			console.log("action", action);

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

			let done = false;

			let reward =
				(142 - chassisBody.position.distanceTo(finish.position)) / 200;

			if (chassisBody.position.distanceTo(finish.position) < 1.3) {
				reward = 1;
				done = true;
				score++;
				document.getElementById("score").innerHTML = score;
			}

			console.log("distance", chassisBody.position.distanceTo(finish.position));
			console.log("reward", reward);

			// const newCurrentState = [
			// 	chassisBody.position.x / 50,
			// 	chassisBody.position.y / 50,
			// 	chassisBody.position.z / 50,
			// 	chassisBody.velocity.x / 17,
			// 	chassisBody.velocity.z / 17,
			// 	chassisBody.quaternion.x,
			// 	chassisBody.quaternion.z,
			// ];

			if (done) {
				reset();
			}

			move++;

			// if (replayMemory.length >= REPLAY_MEMORY_SIZE) {
			// 	replayMemory.shift();
			// }

			// replayMemory.push([
			// 	currentState,
			// 	actionIndex,
			// 	reward,
			// 	newCurrentState,
			// 	done,
			// ]);

			// // console.log("memory length", replayMemory.length);

			// if (epsilon !== MIN_EPSILON) {
			// 	epsilon = Math.max(MIN_EPSILON, epsilon * EPSILON_DECAY);
			// }

			// if (replayMemory.length < MIN_REPLAY_MEMORY_SIZE) {
			// 	// console.log("memory length", replayMemory.length);
			// 	return;
			// }

			// const miniBatch = _.sampleSize(replayMemory, MINIBATCH_SIZE);

			// const currentStates = [];
			// // const actionIndices = [];
			// // const rewards = [];
			// // const newCurrentStates = [];
			// // const dones = [];
			// // const states = [];
			// // const newStates = [];
			// // const currentQs = [];
			// // const futureQs = [];
			// const updatedQs = [];

			// miniBatch.forEach(([state, action, reward, nextState, done], index) => {
			// 	currentStates.push(state);
			// 	// actionIndices.push(action);
			// 	// rewards.push(reward);
			// 	// newCurrentStates.push(nextState);
			// 	// dones.push(done);

			// 	const x = tf.tensor2d(state, [1, 7]);
			// 	const currentQ = model.predict(x);
			// 	// currentQs.push(currentQ);
			// 	// states.push(x);

			// 	const newState = tf.tensor2d(nextState, [1, 7]);
			// 	const futureQ = model.predict(newState);
			// 	// futureQs.push(futureQ);
			// 	// newStates.push(newState);

			// 	currentQ[action] = !done
			// 		? reward + DISCOUNT * futureQ.max().dataSync()
			// 		: reward;

			// 	updatedQs.push(currentQ.dataSync());

			// 	x.dispose();
			// 	newState.dispose();
			// 	currentQ.dispose();
			// 	futureQ.dispose();
			// });

			// const X = tf.tensor2d(currentStates);

			// const y = tf.tensor2d(updatedQs, [MINIBATCH_SIZE, actionSet.length]);

			// console.log("epoch:", epoch);

			// await model.fit(X, y);
			// console.log("trained!");

			// epoch++;

			// X.dispose();
			// y.dispose();
		};

		async function animate() {
			await train();
			// console.log("trained!");
			requestAnimationFrame(animate);
			// updatePhysics();
			debugRenderer.update();
			renderer.render(scene, camera);
		}
		animate();
	});
