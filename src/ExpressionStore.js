import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { runExpression } from "./MathWorkerClient.js";

const initialExpressionsData = {
	// 2x2
	"expr-initial-1": {
		id: "expr-initial-1",
		expression: "eigenvectors({{3,5},{-1,-3}})",
		label: "Приклад (2x2)"
	},
	"expr-initial-2": {
		id: "expr-initial-2",
		expression: "eigenvectors({{3,-1},{-1,3}})",
		label: "Приклад (2x2)"
	},
	"expr-initial-3": {
		id: "expr-initial-3",
		expression: "eigenvectors({{3,12},{1,-1}})",
		label: "Приклад (2x2)"
	},
	// 3x3
	"expr-initial-4": {
		id: "expr-initial-4",
		expression: "eigenvectors({{2,0,1},{-1,4,-1},{-1,2,0}})",
		label: "Приклад (3x3)"
	},
	"expr-initial-5": {
		id: "expr-initial-5",
		expression: "eigenvectors({{3,5,-5},{-2,3,2},{-2,5,0}})",
		label: "Приклад (3x3)"
	},
	"expr-initial-6": {
		id: "expr-initial-6",
		expression: "eigenvectors({{2,-1,1},{0,3,6},{0,0,7}})",
		label: "Приклад (3x3)"
	},
};

const initialTabsData = [
	{
		id: "tab-initial-2x2",
		label: "Приклади (2x2)",
		expressionIds: ["expr-initial-1", "expr-initial-2", "expr-initial-3"],
	},
	{
		id: "tab-initial-3x3",
		label: "Приклади (3x3)",
		expressionIds: ["expr-initial-4", "expr-initial-5", "expr-initial-6"],
	},
];

const initialState = {
	tabs: initialTabsData,
	activeTabId: initialTabsData[0]?.id || null,
	expressions: initialExpressionsData,
};

const expressionStore = create(
	persist(
		(set, get) => ({
			tabs: initialState.tabs,
			activeTabId: initialState.activeTabId,
			expressions: initialState.expressions,

			results: {},
			loadingStates: {},
			editingTabId: null,

			setActiveTab: (tabId) => {
				if (get().editingTabId !== null && get().editingTabId !== tabId) {
					set({ editingTabId: null });
				}
				set({ activeTabId: tabId });
			},

			setEditingTabId: (tabId) => set({ editingTabId: tabId }),

			updateTabLabel: (tabId, newLabel) => {
				const trimmedLabel = newLabel.trim();
				if (!trimmedLabel) {
					console.warn("Tab label cannot be empty.");
					set({ editingTabId: null }); // Still exit edit mode
					return;
				}
				set((state) => ({
					tabs: state.tabs.map((tab) =>
						tab.id === tabId ? { ...tab, label: trimmedLabel } : tab
					),
					editingTabId: null,
				}));
			},

			addTab: () => {
				if (get().tabs.length >= 10) {
					alert("Максимальна кількість вкладок: 10");
					return;
				}
				const newTabId = `tab-${Date.now()}`;
				const newLabel = `Вкладка ${get().tabs.length + 1}`;
				const newTab = {
					id: newTabId,
					label: newLabel,
					expressionIds: [],
				};
				set((state) => ({
					tabs: [...state.tabs, newTab],
					activeTabId: newTabId,
					editingTabId: null,
				}));
				return newTabId;
			},

			deleteTab: (tabId, event) => {
				if (event) {
					event.stopPropagation();
				}
				if (get().tabs.length <= 1) {
					alert("Неможливо видалити останню вкладку");
					return;
				}
				if (!window.confirm("Ви впевнені, що хочете видалити цю вкладку?")) {
					return;
				}

				const tabIndex = get().tabs.findIndex((tab) => tab.id === tabId);
				if (tabIndex === -1) return;

				const deletedTab = get().tabs[tabIndex];
				const updatedExpressions = { ...get().expressions };
				const updatedResults = { ...get().results };
				const updatedLoadingStates = { ...get().loadingStates };
				deletedTab.expressionIds.forEach((exprId) => {
					delete updatedExpressions[exprId];
					delete updatedResults[exprId];
					delete updatedLoadingStates[exprId];
				});

				let newActiveId = get().activeTabId;
				let newEditingTabId = get().editingTabId;

				if (tabId === newActiveId) {
					const remainingTabs = get().tabs.filter((t) => t.id !== tabId);
					newActiveId =
						remainingTabs[tabIndex - 1]?.id ||
						remainingTabs[0]?.id || // Use index 0 if index-1 doesn't exist
						null;
				}
				if (tabId === newEditingTabId) {
					newEditingTabId = null;
				}

				set((state) => ({
					tabs: state.tabs.filter((tab) => tab.id !== tabId),
					expressions: updatedExpressions,
					results: updatedResults,
					loadingStates: updatedLoadingStates,
					activeTabId: newActiveId,
					editingTabId: newEditingTabId,
				}));
			},

			addExpression: (tabId) => {
				const newId = `expr-${Date.now()}`;
				const newExpression = {
					id: newId,
					expression: "eigenvectors({{1}})",
					label: "Без назви",
					printOptions: { rounding: 3 },
				};

				set((state) => ({
					expressions: { ...state.expressions, [newId]: newExpression },
					tabs: state.tabs.map((tab) =>
						tab.id === tabId
							? { ...tab, expressionIds: [...tab.expressionIds, newId] }
							: tab
					),
					results: { ...state.results, [newId]: undefined },
					loadingStates: { ...state.loadingStates, [newId]: false },
				}));

				if (get().activeTabId === tabId) {
					setTimeout(() => get().calculateExpression(newId), 0);
				}

				return newId;
			},

			updateExpression: (expressionId, updatedData) => {
				set((state) => {
					const updatedExpression = {
						...state.expressions[expressionId],
						...updatedData,
					};

					const updatedResults = { ...state.results };
					delete updatedResults[expressionId];
					const updatedLoadingStates = { ...state.loadingStates };
					delete updatedLoadingStates[expressionId];

					return {
						expressions: {
							...state.expressions,
							[expressionId]: updatedExpression,
						},
						results: updatedResults,
						loadingStates: updatedLoadingStates,
					};
				});

				const activeTab = get().tabs.find((t) => t.id === get().activeTabId);
				if (activeTab?.expressionIds.includes(expressionId)) {
					setTimeout(() => get().calculateExpression(expressionId), 0);
				}
			},

			deleteExpression: (expressionId) => {
				const expression = get().expressions[expressionId];

				if (
					!window.confirm(
						`Ви впевнені, що хочете видалити вираз "${
							expression?.label || expressionId
						}"?`
					)
				) {
					return;
				}

				set((state) => {
					const updatedTabs = state.tabs.map((tab) => ({
						...tab,
						expressionIds: tab.expressionIds.filter((id) => id !== expressionId),
					}));

					const updatedExpressions = { ...state.expressions };
					delete updatedExpressions[expressionId];

					const updatedResults = { ...state.results };
					delete updatedResults[expressionId];

					const updatedLoadingStates = { ...state.loadingStates };
					delete updatedLoadingStates[expressionId];

					return {
						tabs: updatedTabs,
						expressions: updatedExpressions,
						results: updatedResults,
						loadingStates: updatedLoadingStates,
					};
				});
			},

			calculateExpression: async (expressionId) => {
				const state = get();

				if (state.loadingStates[expressionId]) {
					return;
				}

				const expressionData = state.expressions[expressionId];
				if (!expressionData) {
					console.error(
						`Cannot calculate: Expression ${expressionId} not found`
					);
					set((state) => ({
						loadingStates: { ...state.loadingStates, [expressionId]: false },
					}));
					return;
				}

				set((state) => ({
					loadingStates: { ...state.loadingStates, [expressionId]: true },
				}));

				try {
					const result = await runExpression(
						expressionData.expression,
						undefined,
						undefined,
						undefined,
						{
							idPrefix: `expr-res-${expressionId}`,
							rounding: expressionData.printOptions?.rounding,
						}
					);

					if (result.resultHTML !== undefined) {
						set((state) => ({
							results: { ...state.results, [expressionId]: result.resultHTML },
						}));
					} else {
						console.error(
							`Error calculating expression ${expressionId}:`,
							result.resultError
						);
						let errorMessage = `Помилка! Будь ласка, перевірте правильність введених даних.`;

						if (result.resultError?.message?.includes("NonSquareMatrixException"))
							errorMessage = "Матриця не є квадратною.";
						else if (result.resultError?.message?.includes("ValueMissingError"))
							errorMessage = "Будь ласка, заповніть усі елементи матриці.";
						else if (result.resultError?.message)
							errorMessage += ` (${result.resultError.message})`;

						set((state) => ({
							results: {
								...state.results,
								[expressionId]: `<p class="error-text">${errorMessage}</p>`, // Added class
							},
						}));
					}
				} catch (error) {
					console.error(`Error calculating expression ${expressionId}:`, error);
					const errorMessage =
						error instanceof Error ? error.message : String(error);

					set((state) => ({
						results: {
							...state.results,
							[expressionId]: `<p class="error-text">Помилка обчислення: ${errorMessage}</p>`, // Added class
						},
					}));
				} finally {
					set((state) => ({
						loadingStates: { ...state.loadingStates, [expressionId]: false },
					}));
				}
			},

			resetToDefaults: () => {
				if (
					window.confirm(
						"Ви впевнені, що хочете скинути всі вкладки та вирази до початкових значень? Ваші поточні дані буде втрачено."
					)
				) {
					set({
						...initialState,
						results: {},
						loadingStates: {},
						editingTabId: null,
					});
				}
			},
		}),
		{
			name: "math-expression-storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				tabs: state.tabs,
				expressions: state.expressions,
				activeTabId: state.activeTabId,
			}),
		}
	)
);

export default expressionStore;