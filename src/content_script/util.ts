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

import * as Config from "../content_script/config";

/**
 * 作品ページの各パートに新しいタブで開くボタンを追加する
 */
export const addMenu = () => {
  const items = document.querySelectorAll(".itemModule.list a");

  if (items.length > 0) {
    for (const item of items) {
      const partID = item?.getAttribute("href")?.replace(/[^0-9]/g, "");
      const bgColor = window.getComputedStyle(item).backgroundColor;
      const a = document.createElement("a");
      a.id = `d-comments-${partID}`;
      a.href = `sc_d_pc?partId=${partID}`;
      Config.getConfig(
        "「コメントを表示しながら再生」ボタンでは新しいタブで開く",
        (value) => {
          if (value) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.innerText = "新しいタブでコメントを表示しながら再生";
          } else {
            a.innerText = "現在のタブでコメントを表示しながら再生";
          }
        }
      );
      item.parentElement?.parentElement?.appendChild(a);
      const style = document.createElement("style");
      style.innerHTML = `
      #d-comments-${partID} {
        text-align:center;
        border-top: 1px solid rgb(224 224 224);
        background-color: ${bgColor};
      }
    `;
      document.head.appendChild(style);
    }
  } else {
    setTimeout(addMenu, 60);
  }
};

/**
 * 視聴ページで title と description をパートタイトルと説明に書き換える
 */
export const setInfo = async () => {
  const apiUrl = document
    .getElementById("restApiUrl")
    ?.getAttribute("value")
    ?.split("&")[0];
  if (apiUrl) {
    const res = await fetch(
      `${apiUrl}&${window.location.search.split("?")[1]}`
    );
    const data = await res.json();
    const title = data["data"]["title"];
    const description = data["data"]["partExp"];
    document.title = title ?? document.title;
    document
      .querySelector("meta[name=Description]")
      ?.setAttribute("content", description);
  } else {
    setTimeout(setInfo, 60);
  }
};
