/*
    This file is part of d-comments.

    d-comments is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    d-comments is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with d-comments.  If not, see <https://www.gnu.org/licenses/>.
*/

import browser from "webextension-polyfill";
import * as Config from "./content_scripts/config";

/**
 * 任意の範囲のランダムな整数を返す
 * @param min 最小値
 * @param max 最大値
 * @returns min 以上 max 以下のランダムな整数
 */
const getRandomInt = (min: number, max: number) => {
	const minNum = Math.ceil(min);
	const maxNum = Math.floor(max);
	return Math.floor(Math.random() * (maxNum - minNum) + minNum);
};

/**
 * 動画情報を取得する
 * @param movieId　ニコニコ動画の動画ID
 * @param sendResponse (response) => void
 */

const getMovieData = (movieId: string, sendResponse: (v) => void) => {
	Config.getConfig("allow_login_to_nicovideo", (config) => {
		const actionTrackId = `${Math.random()
			.toString(36)
			.slice(-10)}_${getRandomInt(10 ** 12, 10 ** 13)}`;
		const url = `https://www.nicovideo.jp/api/watch/${
			config ? "v3" : "v3_guest"
		}/${movieId}`;
		const params = {
			_frontendId: "6",
			_frontendVersion: "0",
			actionTrackId: actionTrackId,
		};

		if (config) {
			browser.cookies
				.get({ url: "https://www.nicovideo.jp/", name: "user_session" })
				.then((cookie) => {
					fetch(`${url}?${new URLSearchParams(params)}`, {
						credentials: "include",
						headers: {
							"x-frontend-id": "6",
							"x-frontend-version": "0",
							Cookie: `user_session=${cookie?.value}`,
						},
					})
						.then((res) => {
							return res.json();
						})
						.then((v) => {
							sendResponse(v);
						});
				});
		} else {
			fetch(`${url}?${new URLSearchParams(params)}`, {
				credentials: "omit",
				headers: {
					"x-frontend-id": "6",
					"x-frontend-version": "0",
				},
			})
				.then((res) => {
					return res.json();
				})
				.then((v) => {
					sendResponse(v);
				});
		}
	});
};

/**
 * コメントスレッドの情報とコメントを取得
 * @param movieData getMovieData で取得した動画情報
 * @returns　Promise<Response>
 */

const getThreadComments = (movieData: any) => {
	const nvComment = movieData.data.comment.nvComment;
	const serverUrl = `${nvComment.server}/v1/threads`;
	const jsonBody = {
		threadKey: nvComment.threadKey,
		params: nvComment.params,
		additionals: {},
	};

	const d = fetch(`${serverUrl}?_frontendId=6`, {
		headers: {
			"Content-Type": "application/json",
			"x-frontend-id": "6",
			"x-frontend-version": "0",
		},
		method: "POST",
		body: JSON.stringify(jsonBody),
	}).then((res) => {
		return res;
	});

	return d;
};

const search = (word: string, UserAgent: string) => {
	const endpoint =
		"https://api.search.nicovideo.jp/api/v2/snapshot/video/contents/search";
	const params = {
		q: word,
		targets: "title,description,tags",
		_sort: "-commentCounter",
		fields:
			"contentId,title,thumbnailUrl,commentCounter,viewCounter,lengthSeconds,userId,channelId",
		_limit: "40",
		_context: "d-comments",
	};
	/**
	 * スナップショットAPIを使って動画を検索する
	 * @see https://site.nicovideo.jp/search-api-docs/snapshot
	 */
	const d = fetch(`${endpoint}?${new URLSearchParams(params)}`, {
		headers: {
			"User-Agent": UserAgent,
		},
	}).then((res) => {
		return res;
	});

	return d;
};

browser.runtime.onMessage.addListener(
	(message, sender, sendResponse: (v: any) => void) => {
		switch (message.type) {
			case "movieData": {
				getMovieData(message.movieId, sendResponse);
				return true;
			}
			case "threadData": {
				getThreadComments(message.movieData)
					.then((res) => {
						return res.json();
					})
					.then((json) => {
						sendResponse(json.data);
					});
				return true;
			}
			case "search": {
				search(message.word, message.UserAgent)
					.then((res) => {
						return res.json();
					})
					.then((json) => {
						sendResponse(json);
					});
				return true;
			}
			case "user": {
				const url = `https://nvapi.nicovideo.jp/v1/users/${message.id}`;
				fetch(url, {
					headers: {
						"User-Agent": message.UserAgent,
						"x-frontend-id": "6",
						"x-frontend-version": "0",
					},
				})
					.then((res) => {
						return res.json();
					})
					.then((json) => {
						sendResponse(json);
					});
				return true;
			}
			case "channel": {
				const url = `https://api.cas.nicovideo.jp/v2/tanzakus/channel/ch${message.id}/`;
				fetch(url)
					.then((res) => {
						return res.json();
					})
					.then((json) => {
						sendResponse(json);
					});
				return true;
			}
		}
		return undefined;
	},
);

/**
 * インストール直後につかいかたページを開く
 */
browser.runtime.onInstalled.addListener((details) => {
	if (details.reason === "install") {
		browser.tabs.create({
			url: browser.runtime.getURL("how_to_use.html"),
		});
	}
});

export default {};
