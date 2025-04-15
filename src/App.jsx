import React, { useState, useEffect } from "react";
import { initializeWorker } from "./MathWorkerClient.js";
import MathWorkspace from "./MathWorkspace.jsx";
import expressionStore from "./ExpressionStore.js";

function App() {
	const resetToDefaults = expressionStore((state) => state.resetToDefaults);

	const [isWorkerReady, setIsWorkerReady] = useState(false);
	const [workerError, setWorkerError] = useState(null);

	useEffect(() => {
		initializeWorker()
			.then(() => {
				setIsWorkerReady(true);
			})
			.catch((error) => {
				setWorkerError(error);
			});
	}, []);

	if (workerError)
		return (
			<div className="error-message">
				Помилка ініціалізації обчислювального двигуна. Будь ласка, перевірте
				консоль і оновіть сторінку. Помилка: {workerError.message}
			</div>
		);
	if (!isWorkerReady) return <div>Завантаження...</div>;

	return (
		<div className="app-container">
			<header className="app-header">
				<div className="app-header-content">
					<div
						className="app-reset-button-wrapper"
						onClick={() => resetToDefaults()}
						title="Натисніть, щоб скинути до початкових значень"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="36"
							height="36"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#1976d2"
							strokeWidth="3.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path stroke="none" d="M0 0h24v24H0z" fill="none" />{" "}
							<path d="M6 20l6.5 -9" /> <path d="M19 20c-6 0 -6 -16 -12 -16" />
						</svg>
					</div>
					<h1 className="app-title">
						Знаходження власних значень та власних векторів
					</h1>
				</div>
			</header>

			<main>
				<section id="resdiv">
					<MathWorkspace />
				</section>
			</main>
		</div>
	);
}

export default App