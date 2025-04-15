import React from "react";
import ExpressionCard from "./ExpressionCard.jsx";
import expressionStore from "./ExpressionStore.js";

function TabContent({ tabId }) {
	const tab = expressionStore((state) =>
		state.tabs.find((t) => t.id === tabId)
	);
	const expressions = expressionStore((state) => state.expressions);
	const addExpression = expressionStore((state) => state.addExpression);

	if (!tab) return <div className="error-message">Помилка: Вкладку не знайдено</div>;

	const expressionIds = tab.expressionIds || [];

	return (
		<div>
			{expressionIds.length === 0 ? (
				<div className="tab-content-empty">
					<p>У цій вкладці ще немає задач. Натисніть нижче, щоб додати!</p>
				</div>
			) : (
				expressionIds.map((exprId) => {
					const expression = expressions[exprId];

					if (!expression) {
						console.warn(
							`Expression ${exprId} not found in expressions for tab ${tabId}`
						);
						return (
							<div key={exprId} className="error-message">
								{" "}
								Помилка: Дані виразу {exprId} відсутні.{" "}
							</div>
						);
					}

					return <ExpressionCard key={exprId} expressionId={exprId} />;
				})
			)}

			<button
				className="tab-content-add-button"
				onClick={() => addExpression(tabId)}
			>
				+ Додати
			</button>
		</div>
	);
}

export default TabContent;