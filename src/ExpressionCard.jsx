import React, { useState, useRef, useEffect } from "react";
import expressionStore from "./ExpressionStore.js";
import {
	initializeVanillaInteractions,
	scanAndApplyMathPaint,
} from "./MathInteractionUtils.js";
import { runExpression } from "./MathWorkerClient";

function ExpressionCard({ expressionId }) {
	const expression = expressionStore(
		(state) => state.expressions[expressionId]
	);
	const result = expressionStore((state) => state.results[expressionId]);
	const isLoading = expressionStore(
		(state) => state.loadingStates[expressionId]
	);

	const calculateExpression = expressionStore(
		(state) => state.calculateExpression
	);
	const deleteExpression = expressionStore(
		(state) => state.deleteExpression
	);
	const updateExpression = expressionStore(
		(state) => state.updateExpression
	);

	const [isEditing, setIsEditing] = useState(!expression?.expression);
	const [editValue, setEditValue] = useState(expression?.expression || "");
	const [editLabel, setEditLabel] = useState(expression?.label || "");

	const resultRef = useRef(null);
	const expandedDetailsRef = useRef(new Set());

	useEffect(() => {
		setEditValue(expression.expression);
		setEditLabel(expression.label);
	}, [expression]);

	useEffect(() => {
		const currentResultRef = resultRef.current;
		let interactionCleanup = null;

		if (currentResultRef && result) {
			const handleDetailsClick = async (event) => {
				const summary = event.target.closest("summary");
				if (!summary) return;

				const details = summary.parentElement;
				if (!details || !details.hasAttribute("data-details")) return;

				const detailsId = details.getAttribute("data-id-prefix");
				if (!detailsId) {
					console.warn(
						"Details element missing data-id-prefix in ExpressionCard:",
						expressionId
					);
					return;
				}

				const targetDiv = details.querySelector(".indented");
				const alreadyLoaded = targetDiv && targetDiv.childElementCount > 0;
				const wasExpanded = expandedDetailsRef.current.has(detailsId);

				if (!details.open && !alreadyLoaded) {
					event.preventDefault();
					try {
						const rawDetailsData = details.getAttribute("data-details");
						const detailsData = JSON.parse(rawDetailsData);

						const additionalContent = await runExpression(
							`${detailsData.type}(${detailsData.matrix})`,
							undefined,
							undefined,
							undefined,
							{ idPrefix: "i-action-temp", rounding: undefined }
						);

						if (targetDiv) {
							targetDiv.innerHTML = additionalContent.resultHTML;
							details.open = true;

							requestAnimationFrame(() => {
								try {
									scanAndApplyMathPaint(targetDiv);
									initializeVanillaInteractions(targetDiv);
								} catch (paintError) {
									console.error("Error painting dynamic content:", paintError);
								}
							});

							expandedDetailsRef.current.add(detailsId);
						}
					} catch (error) {
						console.error("Error loading details content:", error);
						if (targetDiv)
							targetDiv.innerHTML =
								"<p class='error-text'>Failed to load details.</p>";
						details.open = true;
					}
				} else if (details.open && wasExpanded) {
					expandedDetailsRef.current.delete(detailsId);
				} else if (!details.open && wasExpanded && alreadyLoaded) {
					expandedDetailsRef.current.add(detailsId);
				}
			};

			currentResultRef.addEventListener("click", handleDetailsClick);

			const timerId = setTimeout(() => {
				try {
					scanAndApplyMathPaint(currentResultRef);
					initializeVanillaInteractions(currentResultRef);
				} catch (error) {
					console.error(
						`Error applying initial paint/interactions for ExpressionCard ${expressionId}:`,
						error
					);
				}
			}, 50);

			return () => {
				clearTimeout(timerId);
				currentResultRef.removeEventListener("click", handleDetailsClick);
				if (typeof interactionCleanup === "function") {
					interactionCleanup();
				}
			};
		}

		return undefined;
	}, [result, expressionId]);

	const handleSave = () => {
		if (!editValue.trim()) {
			alert("Expression cannot be empty.");
			return;
		}
		updateExpression(expressionId, {
			expression: editValue.trim(),
			label: editLabel.trim() || "Без назви",
		});
		setIsEditing(false);
		expandedDetailsRef.current.clear();
	};

	const handleCancelEdit = () => {
		setEditValue(expression?.expression || "");
		setEditLabel(expression?.label || "");
		setIsEditing(false);
	};

	if (!expression) {
		return <div className="error-message">Помилка: вираз не знайдено</div>;
	}

	return (
		<div className="expression-card">
			<div className="expression-card-header">
				<h3 className="expression-card-title">
					{isEditing ? "Редагування виразу" : expression.label}
				</h3>
				<div className="expression-card-controls">
					{isEditing ? (
						<>
							<button className="button-base button-save" onClick={handleSave}>
								Зберегти
							</button>
							<button
								className="button-base button-cancel"
								onClick={handleCancelEdit}
							>
								Скасувати
							</button>
						</>
					) : (
						<>
							<button
								className="button-base button-edit"
								onClick={() => setIsEditing(true)}
							>
								Редагувати
							</button>
							<button
								className="button-base"
								disabled={isLoading || isEditing}
								onClick={() => calculateExpression(expressionId)}
							>
								Перерахувати {isLoading ? "..." : ""}
							</button>
							<button
								className="button-base button-delete"
								disabled={isLoading || isEditing}
								onClick={() => deleteExpression(expressionId)}
							>
								Видалити
							</button>
						</>
					)}
				</div>
			</div>

			{isEditing ? (
				<div className="editor-area">
					<div className="form-group">
						<label
							htmlFor={`expr-label-${expressionId}`}
							className="form-label"
						>
							Назва:
						</label>
						<input
							id={`expr-label-${expressionId}`}
							type="text"
							value={editLabel}
							onChange={(e) => setEditLabel(e.target.value)}
							className="form-input"
						/>
					</div>
					<div className="form-group">
						<label
							htmlFor={`expr-content-${expressionId}`}
							className="form-label"
						>
							Вираз:
						</label>
						<input
							id={`expr-content-${expressionId}`}
							type="text"
							value={editValue}
							onChange={(e) => setEditValue(e.target.value)}
							className="form-input"
						/>
					</div>
				</div>
			) : (
				<div className="expression-display">
					<code className="expression-code">{expression.expression}</code>
				</div>
			)}

			<div className="result-container">
				{isLoading ? (
					<div className="loading-indicator">
						Обчислення... будь ласка, зачекайте.
					</div>
				) : result ? (
					<div
						className="result-display"
						ref={resultRef}
						dangerouslySetInnerHTML={{ __html: result }}
					/>
				) : (
					!isEditing && (
						<button
							className="calculate-button"
							onClick={() => calculateExpression(expressionId)}
						>
							.....
						</button>
					)
				)}
			</div>
		</div>
	);
}

export default ExpressionCard;
