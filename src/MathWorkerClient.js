let workerInstance = null;
let initializationPromise = null;
let messageIdCounter = 0;
const pendingRequests = {};

export const initializeWorker = () => {
	if (initializationPromise) {
		return initializationPromise;
	}

	console.log("Initializing Simplified Math Worker...");

	initializationPromise = new Promise((resolve, reject) => {
		try {
			const baseUrl = import.meta.env.BASE_URL || "/";
			const workerPath = `${baseUrl}math.js`;
			workerInstance = new Worker(workerPath, { type: "module" });

			workerInstance.onmessage = (event) => {
				const { id, result, error } = event.data;

				if (id === undefined || !pendingRequests[id]) {
					console.warn("Client received message with unknown or missing id:", event.data);
					return;
				}

				const { resolve: reqResolve, reject: reqReject } = pendingRequests[id];
				delete pendingRequests[id];

				if (error) {
					console.error(`Worker error for request id ${id}:`, error);
					const errorObj = new Error(error.message);
					errorObj.name = error.name || 'WorkerError';
					errorObj.stack = error.stack;
					reqReject(errorObj);
				} else {
					reqResolve(result);
				}
			};

			workerInstance.onerror = (error) => {
				console.error("Worker error:", error);

				Object.values(pendingRequests).forEach(({ reject: reqReject }) => {
					reqReject(new Error("Worker encountered an unrecoverable error."));
				});
				Object.keys(pendingRequests).forEach(key => delete pendingRequests[key]);

				reject(new Error("Worker failed to load or crashed."));
				initializationPromise = null;
				workerInstance = null;
			};

			workerInstance.onmessageerror = (event) => {
				console.error("Worker message error (serialization failed?):", event);

				Object.values(pendingRequests).forEach(({ reject: reqReject }) => {
					reqReject(new Error("Failed to communicate with worker (message error)."));
				});
				Object.keys(pendingRequests).forEach(key => delete pendingRequests[key]);
			};

			console.log("Simplified Math Worker instance created and listeners attached.");
			resolve();

		} catch (error) {
			console.error("Failed to initialize worker:", error);
			reject(error);
			initializationPromise = null;
		}
	});

	return initializationPromise;
};

const getWorkerInstance = async () => {
	if (!initializationPromise) {
		throw new Error("Worker not initialized. Call initializeWorker first.");
	}
	await initializationPromise;
	if (!workerInstance) {
		throw new Error("Worker initialization failed or worker terminated.");
	}
	return workerInstance;
};

export const runExpression = async (
	expression,
	kInputValue,
	kInputId,
	matrixTableStates,
	printOptions
) => {
	const worker = await getWorkerInstance();
	const messageId = ++messageIdCounter;

	return new Promise((resolve, reject) => {
		pendingRequests[messageId] = { resolve, reject };

		worker.postMessage({
			id: messageId,
			name: 'runExpression',
			args: [
				expression,
				kInputValue,
				kInputId,
				matrixTableStates,
				printOptions
			],
		});
	});
};
