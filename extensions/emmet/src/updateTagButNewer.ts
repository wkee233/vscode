/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { toLSTextDocument, validate } from './util';
import { getLanguageService, TextDocument as LSTextDocument, Node as LSNode } from 'vscode-html-languageservice';

const languageService = getLanguageService();

export function updateTag(tagName: string): Thenable<boolean> | undefined {
	if (!validate(false) || !vscode.window.activeTextEditor) {
		return;
	}
	const editor = vscode.window.activeTextEditor;

	// multicursor support
	const rangesToUpdate = editor.selections.reverse()
		.reduce<vscode.Range[]>((prev, selection) =>
			prev.concat(getRangesToUpdate(editor, selection)), []);

	return editor.edit(editBuilder => {
		rangesToUpdate.forEach(range => {
			editBuilder.replace(range, tagName);
		});
	});
}

function getPositionFromOffset(offset: number | undefined, document: LSTextDocument): vscode.Position | undefined {
	if (!offset) {
		return undefined;
	}
	const pos = document.positionAt(offset);
	const vspos = new vscode.Position(pos.line, pos.character);
	return vspos;
}

function getRangesFromNode(node: LSNode, document: LSTextDocument): vscode.Range[] {
	const start = getPositionFromOffset(node.start, document);
	const startTagEnd = getPositionFromOffset(node.startTagEnd, document);
	const end = getPositionFromOffset(node.end, document);
	const endTagStart = getPositionFromOffset(node.endTagStart, document);

	let ranges: vscode.Range[] = [];
	if (startTagEnd) {
		ranges.push(new vscode.Range(start!.translate(0, 1), start!.translate(0, 1).translate(0, node?.tag?.length ?? 0)));
	}
	if (endTagStart) {
		ranges.push(new vscode.Range(endTagStart.translate(0, 2), end!.translate(0, -1)));
	}

	return ranges;
}

function getRangesToUpdate(editor: vscode.TextEditor, selection: vscode.Selection): vscode.Range[] {
	const document = toLSTextDocument(editor.document);
	const parsedDocument = languageService.parseHTMLDocument(document);
	const selectionStartOffset = document.offsetAt(selection.start);

	const nodeToUpdate: any = parsedDocument.findNodeAt(selectionStartOffset);
	const ranges = getRangesFromNode(nodeToUpdate, document);
	console.log(ranges);
	return ranges;
}
