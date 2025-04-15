import React, { useState, useEffect, useRef } from "react";
import TabContent from "./TabContent.jsx";
import expressionStore from "./ExpressionStore.js";

function MathWorkspace() {
	const tabs = expressionStore((state) => state.tabs);
	const activeTabId = expressionStore((state) => state.activeTabId);
	const expressionResults = expressionStore((state) => state.results);
	const loadingStates = expressionStore((state) => state.loadingStates);
	const editingTabId = expressionStore((state) => state.editingTabId);

	const setActiveTab = expressionStore((state) => state.setActiveTab);
	const addTab = expressionStore((state) => state.addTab);
	const deleteTab = expressionStore((state) => state.deleteTab);
	const calculateExpression = expressionStore(
		(state) => state.calculateExpression
	);
	const setEditingTabId = expressionStore((state) => state.setEditingTabId);
	const updateTabLabel = expressionStore((state) => state.updateTabLabel);

	const [editValue, setEditValue] = useState("");
	const inputRef = useRef(null);
	const [hoveredTabId, setHoveredTabId] = useState(null);

	useEffect(() => {
		if (editingTabId && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [editingTabId]);

	useEffect(() => {
		if (!activeTabId) return;
		const activeTab = tabs.find((tab) => tab.id === activeTabId);
		if (!activeTab) return;
		activeTab.expressionIds.forEach((expressionId) => {
			if (!expressionResults[expressionId] && !loadingStates[expressionId]) {
				calculateExpression(expressionId);
			}
		});
	}, [activeTabId, tabs, expressionResults, loadingStates, calculateExpression]);

	const handleEditChange = (event) => {
		setEditValue(event.target.value);
	};

	const handleEditSave = (tabId) => {
		const trimmedValue = editValue.trim();
		if (trimmedValue) {
			updateTabLabel(tabId, trimmedValue);
		} else {
			console.warn("Tab label cannot be empty. Reverting.");
			setEditingTabId(null);
		}
	};

	const handleEditCancel = () => {
		setEditingTabId(null);
	};

	const handleKeyDown = (event, tabId) => {
		if (event.key === "Enter") handleEditSave(tabId);
		else if (event.key === "Escape") handleEditCancel();
	};

	const handleEditIconClick = (event, tab) => {
		event.stopPropagation();
		setEditValue(tab.label);
		setEditingTabId(tab.id);
		setHoveredTabId(null);
	};

	const getTabButtonClassName = (tabId) => {
		let classes = "tab-button";
		if (activeTabId === tabId) {
			classes += " tab-button-active";
		}
		return classes;
	};

	return (
		<div className="tabbed-math-content">
			<div className="tab-nav">
				{tabs.map((tab) => (
					<button
						className={getTabButtonClassName(tab.id)}
						key={tab.id}
						onClick={() => {
							if (editingTabId !== tab.id) {
								setActiveTab(tab.id);
							}
						}}
						onMouseEnter={() => setHoveredTabId(tab.id)}
						onMouseLeave={() => setHoveredTabId(null)}
					>
						{editingTabId === tab.id ? (
							<input
								ref={inputRef}
								type="text"
								value={editValue}
								onChange={handleEditChange}
								onBlur={() => handleEditSave(tab.id)}
								onKeyDown={(e) => handleKeyDown(e, tab.id)}
								className="tab-input"
								onClick={(e) => e.stopPropagation()}
							/>
						) : (
							<div className="tab-content-wrapper">
								<span className="tab-label" title={tab.label}>
									{tab.label}
								</span>
								{hoveredTabId === tab.id && (
									<span
										className="tab-edit-icon"
										onClick={(e) => handleEditIconClick(e, tab)}
										title="Rename tab"
									>
										✏️
									</span>
								)}
							</div>
						)}

						{tabs.length > 1 && editingTabId !== tab.id && (
							<div
								className="tab-close-button"
								onClick={(e) => {
									e.stopPropagation();
									deleteTab(tab.id);
								}}
								title="Close tab"
							>
								×
							</div>
						)}
					</button>
				))}
				{tabs.length < 10 && (
					<button className="tab-add-button" onClick={() => addTab()}>
						+ Нова вкладка
					</button>
				)}
			</div>

			<div className="tab-content-area">
				{tabs.map((tab) => (
					<div
						key={tab.id}
						style={{ display: activeTabId === tab.id ? "block" : "none" }}
					>
						<TabContent tabId={tab.id} />
					</div>
				))}
			</div>
		</div>
	);
}

export default MathWorkspace;