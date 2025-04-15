const CMC = {};

CMC.paint = function (targetElement) {
	try {
		const paddingRect = targetElement.getBoundingClientRect();

		if (paddingRect.width <= 0 || paddingRect.height <= 0) {
			return;
		}
		const width = paddingRect.width;
		const height = paddingRect.height;

		const getPointByCell = (parentRect, rows, indexes) => {
			const rowIndex = indexes[0];
			const colIndex = indexes[1];
			if (!rows[rowIndex] || !rows[rowIndex][colIndex]) {
				return { x: parentRect.width / 2, y: parentRect.height / 2 };
			}
			const cellElement = rows[rowIndex][colIndex];
			const cellRect = cellElement.getBoundingClientRect();

			const x = (cellRect.left + cellRect.right) / 2 - parentRect.left;
			const y = (cellRect.top + cellRect.bottom) / 2 - parentRect.top;
			return { x, y };
		};

		const cellsAttr = targetElement.getAttribute("data-cells");
		if (!cellsAttr) {
			return;
		}
		const cells = JSON.parse(cellsAttr);
		const color = targetElement.getAttribute("data-color");

		const strokeStyle =
			color === "0a"
				? "#d500e7"
				: color === "0"
					? "#0f8100"
					: color === "1a"
						? "#0000ad"
						: color === "1"
							? "#ff0000"
							: "#111111";

		const lineWidth = 1.5;
		const table = targetElement.querySelector("mtable");
		if (!table) {
			return;
		}

		const rows = [];
		const tableChildren = table.children;
		for (let i = 0; i < tableChildren.length; i++) {
			const currentRowElement = tableChildren[i];
			if (currentRowElement.tagName.toLowerCase() === "mtr") {
				const row = [];
				const rowChildren = currentRowElement.children;
				for (let j = 0; j < rowChildren.length; j++) {
					const currentCellElement = rowChildren[j];
					if (currentCellElement.tagName.toLowerCase() === "mtd") {
						row.push(currentCellElement);
					}
				}
				if (row.length > 0) {
					rows.push(row);
				}
			}
		}

		if (rows.length === 0) {
			return;
		}

		let svgLines = "";
		if (cells && cells.length > 0) {
			for (let i = 0; i < cells.length; i += 1) {
				const p1 = getPointByCell(paddingRect, rows, cells[i]);
				const nextIndex = i === cells.length - 1 ? 0 : i + 1;
				const p2 = getPointByCell(paddingRect, rows, cells[nextIndex]);
				svgLines += `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${strokeStyle}" stroke-width="${lineWidth}" />`;
			}
		} else {
			targetElement.style.backgroundImage = "";
			return;
		}

		const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgLines}</svg>`;
		const backgroundImage = `data:image/svg+xml,${encodeURIComponent(
			svgContent
		)}`;

		targetElement.style.backgroundImage = `url("${backgroundImage}")`;
		targetElement.style.backgroundRepeat = "no-repeat";
		targetElement.style.backgroundPosition = "center center";
		targetElement.style.backgroundSize = `${width}px ${height}px`;
	} catch (error) {
		targetElement.style.backgroundImage = "";
	}
};

export const paintArrows = function (arrowWithLabel) {
	try {
		const arrow = arrowWithLabel.querySelector(".arrow");
		const previousSibling = arrowWithLabel.previousElementSibling;

		if (!arrow || !previousSibling) {
			return;
		}

		const table = previousSibling.querySelector("mtable");
		if (!table) {
			return;
		}

		const startAttr = arrowWithLabel.getAttribute("data-start");
		const endAttr = arrowWithLabel.getAttribute("data-end");
		if (startAttr === null || endAttr === null) {
			return;
		}
		const start = Number(startAttr);
		const end = Number(endAttr);

		let rowIndex = 0;
		let startRow = undefined;
		let endRow = undefined;

		const tableChildren = table.children;
		for (let i = 0; i < tableChildren.length; i++) {
			const currentRowElement = tableChildren[i];
			if (currentRowElement.tagName.toLowerCase() === "mtr") {
				if (rowIndex === start) startRow = currentRowElement;
				if (rowIndex === end) endRow = currentRowElement;
				rowIndex += 1;
				if (startRow && endRow) break;
			}
		}

		if (!startRow || !endRow) {
			return;
		}

		let startRowRect = startRow.getBoundingClientRect();
		let endRowRect = endRow.getBoundingClientRect();
		const tableRect = table.getBoundingClientRect();

		if (
			startRowRect.height <= 0 ||
			endRowRect.height <= 0 ||
			tableRect.height <= 0
		) {
			return;
		}

		if (end < start) {
			const tmp = endRowRect;
			endRowRect = startRowRect;
			startRowRect = tmp;
		}

		const startRowCenterY = (startRowRect.top + startRowRect.bottom) / 2;
		const endRowCenterY = (endRowRect.top + endRowRect.bottom) / 2;
		const tableCenterY = (tableRect.top + tableRect.bottom) / 2;
		const arrowHeight = Math.abs(endRowCenterY - startRowCenterY);
		const arrowWithLabelVerticalAlign =
			tableCenterY - (startRowCenterY + endRowCenterY) / 2;

		window.requestAnimationFrame(() => {
			arrow.style.height = `${arrowHeight}px`;
			arrow.style.position = "absolute";
			arrow.style.top = "50%";
			arrow.style.marginTop = `${-arrowHeight / 2}px`;
			arrowWithLabel.style.verticalAlign = `${arrowWithLabelVerticalAlign}px`;
		});
	} catch (error) {
		if (arrowWithLabel.querySelector(".arrow")) {
			requestAnimationFrame(() => {
				const arrow = arrowWithLabel.querySelector(".arrow");
				if (arrow) {
					arrow.style.height = "";
					arrow.style.marginTop = "";
				}
				arrowWithLabel.style.verticalAlign = "";
			});
		}
	}
};

export function scanAndApplyMathPaint(containerElement) {
	if (!containerElement) {
		return;
	}

	const mencloseElements = containerElement.querySelectorAll(
		'[data-custom-paint="custom-menclose"]'
	);
	mencloseElements.forEach((element) => {
		CMC.paint(element);
	});

	const arrowElements = containerElement.querySelectorAll(
		'[data-custom-paint="arrow-with-label"]'
	);
	arrowElements.forEach((element) => {
		paintArrows(element);
	});
}

let currentHighlightedIds = undefined;

const clearHighlights = () => {
	if (currentHighlightedIds) {
		for (const id of currentHighlightedIds) {
			const element = document.getElementById(id);
			if (element) {
				element.style.backgroundColor = "";
				element.style.color = "";
			}
		}
		currentHighlightedIds = undefined;
	}
};

const applyHighlight = (triggerElement) => {
	if (!triggerElement) {
		clearHighlights();
		return;
	}

	const highlightAttribute = triggerElement.getAttribute("data-highlight");

	if (highlightAttribute) {
		clearHighlights();

		const newHighlightIds = highlightAttribute
			.replace(/[#\s]/g, "")
			.split(",")
			.filter((id) => id);

		if (newHighlightIds.length > 0) {
			for (const id of newHighlightIds) {
				const targetElement = document.getElementById(id);
				if (targetElement) {
					targetElement.style.backgroundColor = "#0020ff";
					targetElement.style.color = "white";
				}
			}
			currentHighlightedIds = newHighlightIds;
		} else {
			currentHighlightedIds = undefined;
		}
	} else {
		clearHighlights();
	}
};

let tooltipElement = null;
let keyDownTargetElement = undefined;

const onTooltipKeyDown = (event) => {
	const ESCAPE_KEY_CODE = 27;

	if (
		event.keyCode === ESCAPE_KEY_CODE &&
		!event.ctrlKey &&
		!event.altKey &&
		!event.shiftKey &&
		!event.metaKey &&
		!event.defaultPrevented
	) {
		event.preventDefault();
		hideTooltip();
	}
};

const ensureTooltipElement = () => {
	if (!tooltipElement) {
		tooltipElement = document.createElement("div");
		tooltipElement.id = "highlight-tooltip";
		tooltipElement.setAttribute("role", "tooltip");
		tooltipElement.classList.add("tooltip-dialog");
		tooltipElement.style.position = "absolute";
		tooltipElement.style.zIndex = "1000";
		tooltipElement.style.visibility = "hidden";
		document.body.appendChild(tooltipElement);
	}
};

const hideTooltip = () => {
	if (!tooltipElement) return;

	if (keyDownTargetElement) {
		keyDownTargetElement.removeEventListener("keydown", onTooltipKeyDown, false);
		keyDownTargetElement = undefined;
	}
	if (tooltipElement.hasAttribute("open")) {
		tooltipElement.removeAttribute("open");
		tooltipElement.style.visibility = "hidden";
		tooltipElement.innerHTML = "";
	}
};

const showTooltipForElement = (triggerElement) => {
	if (!triggerElement) {
		hideTooltip();
		return;
	}

	ensureTooltipElement();

	let tooltipContentSource = null;
	const explicitTooltipId = triggerElement.getAttribute("data-tooltip");

	if (explicitTooltipId) {
		const sourceById = document.getElementById(explicitTooltipId);
		if (sourceById) {
			tooltipContentSource = sourceById;
		} else {
			hideTooltip();
			return;
		}
	} else if (
		triggerElement.classList.contains("a-tooltip") &&
		triggerElement.innerHTML.trim() !== ""
	) {
		tooltipContentSource = triggerElement;
	} else {
		const targetId = triggerElement.getAttribute("data-for");
		if (targetId) {
			const relatedSource = document.querySelector(
				`.a-tooltip[data-for="${targetId}"]`
			);
			if (relatedSource && relatedSource.innerHTML.trim() !== "") {
				tooltipContentSource = relatedSource;
			} else {
				hideTooltip();
				return;
			}
		} else {
			hideTooltip();
			return;
		}
	}

	const targetId = triggerElement.getAttribute("data-for");
	const targetElement = targetId ? document.getElementById(targetId) : null;

	if (!targetElement) {
		hideTooltip();
		return;
	}

	if (keyDownTargetElement && keyDownTargetElement !== targetElement) {
		keyDownTargetElement.removeEventListener("keydown", onTooltipKeyDown, false);
		keyDownTargetElement = undefined;
	}

	if (keyDownTargetElement !== targetElement) {
		targetElement.addEventListener("keydown", onTooltipKeyDown, false);
		keyDownTargetElement = targetElement;
	}

	tooltipElement.innerHTML = "";
	const contentClone = tooltipContentSource.cloneNode(true);

	if (tooltipContentSource.childNodes.length > 0) {
		while (contentClone.firstChild) {
			tooltipElement.appendChild(contentClone.firstChild);
		}
	} else {
		tooltipElement.textContent = tooltipContentSource.textContent;
	}

	const targetRect = targetElement.getBoundingClientRect();

	tooltipElement.style.visibility = "hidden";
	tooltipElement.style.display = "block";
	tooltipElement.style.left = "-9999px";
	tooltipElement.style.top = "-9999px";

	const tooltipWidth = tooltipElement.offsetWidth;
	const tooltipHeight = tooltipElement.offsetHeight;
	const spaceAbove = 8.5;

	let top = window.pageYOffset + targetRect.top - tooltipHeight - spaceAbove;
	let left =
		window.pageXOffset +
		targetRect.left +
		targetRect.width / 2 -
		tooltipWidth / 2;

	if (top < window.pageYOffset) {
		top = window.pageYOffset + targetRect.bottom + spaceAbove;
	}
	if (left < window.pageXOffset) {
		left = window.pageXOffset;
	}
	const viewportWidth = document.documentElement.clientWidth;
	if (left + tooltipWidth > window.pageXOffset + viewportWidth) {
		left = window.pageXOffset + viewportWidth - tooltipWidth;
	}

	tooltipElement.style.top = `${top}px`;
	tooltipElement.style.left = `${left}px`;
	tooltipElement.style.right = "auto";
	tooltipElement.style.bottom = "auto";

	tooltipElement.style.display = "";
	tooltipElement.style.visibility = "visible";
	tooltipElement.setAttribute("open", "open");
};

const createInteractionHandlers = (updateFunction) => {
	const hoveredElements = [];
	const focusedElements = [];

	return (triggerElement) => {
		const targetId = triggerElement.getAttribute("data-for");
		const targetElement = targetId
			? document.getElementById(targetId)
			: triggerElement;

		if (!targetElement) {
			return;
		}

		if (targetElement.getAttribute("tabindex") === null) {
			const tagName = targetElement.tagName.toLowerCase();
			const focusableTags = ["a", "button", "input", "textarea", "select"];

			if (
				["mrow", "mtd", "span"].includes(tagName) ||
				!focusableTags.includes(tagName)
			) {
				if (targetElement.tabIndex < 0) {
					targetElement.setAttribute("tabindex", "0");
				}
			}
		}

		const updateState = () => {
			window.setTimeout(() => {
				const activeElement =
					hoveredElements.length > 0
						? hoveredElements[hoveredElements.length - 1]
						: focusedElements.length > 0
							? focusedElements[focusedElements.length - 1]
							: undefined;
				updateFunction(activeElement);
			}, 0);
		};

		targetElement.addEventListener(
			"mouseenter",
			() => {
				hoveredElements.push(triggerElement);
				updateState();
			},
			false
		);

		targetElement.addEventListener(
			"mouseleave",
			() => {
				const index = hoveredElements.lastIndexOf(triggerElement);
				if (index > -1) {
					hoveredElements.splice(index, 1);
				}
				updateState();
			},
			false
		);

		targetElement.addEventListener(
			"focus",
			() => {
				if (!focusedElements.includes(triggerElement)) {
					focusedElements.push(triggerElement);
				}
				updateState();
			},
			false
		);

		targetElement.addEventListener(
			"blur",
			() => {
				const index = focusedElements.lastIndexOf(triggerElement);
				if (index > -1) {
					focusedElements.splice(index, 1);
				}
				updateState();
			},
			false
		);
	};
};

export const initializeAHighlight = createInteractionHandlers(applyHighlight);

export const initializeATooltip = createInteractionHandlers(showTooltipForElement);

const INITIALIZED_ATTR = "data-interaction-initialized";

export function initializeVanillaInteractions(containerElement) {
	if (!containerElement) return;

	const highlightTriggers = containerElement.querySelectorAll(
		`.a-highlight:not([${INITIALIZED_ATTR}])`
	);
	highlightTriggers.forEach((element) => {
		try {
			initializeAHighlight(element);
			element.setAttribute(INITIALIZED_ATTR, "true");
		} catch (error) {
			console.error("Error initializing highlight:", error, element);
		}
	});

	const tooltipTriggers = containerElement.querySelectorAll(
		`.a-tooltip:not([${INITIALIZED_ATTR}])`
	);
	tooltipTriggers.forEach((element) => {
		try {
			initializeATooltip(element);
			element.setAttribute(INITIALIZED_ATTR, "true");
		} catch (error) {
			console.error("Error initializing tooltip:", error, element);
		}
	});
}