// =====================================================================
// Button that will be added to the page to download the chat.
// =====================================================================

/**
 * Generates the download button and adds it to the page.
 */
(function generateDownloadButton() {
  const downloadButton = document.createElement('button');
  downloadButton.classList.add('gpt-downloader-button');
  downloadButton.innerText = 'Download this chat';
  downloadButton.addEventListener('click', handleClick);
  document.body.appendChild(downloadButton);
})();

// =====================================================================
// Error message logic.
// =====================================================================
const errorMessage = document.createElement('button');

/**
 * Generates the error message and adds it to the page.
 * The error message is hidden by default.
 * It will be shown if the user clicks the download button and no messages are found.
 * The error message will be hidden again if the user clicks the download button again or after 2.5 seconds.
 */
(function generateErrorMessage() {
  errorMessage.classList.add('gpt-downloader-button', 'error');
  errorMessage.innerText = 'Error: No messages found';
  errorMessage.addEventListener('click', toggleErrorMessage.bind(null, false));
  document.body.appendChild(errorMessage);
})();

/**
 * Toggles the error message. This is triggered when the user
 * clicks the download button and there no messages are found or
 * when the user clicks the error message.
 * The message will be hidden after 2.5 seconds. This is an arbitrary value.
 * @param {boolean} shouldAdd Whether the error message should be shown or hidden.
 */
function toggleErrorMessage(shouldAdd) {
  errorMessage.classList.toggle('visible', shouldAdd);
  if (shouldAdd && errorMessage.classList.contains('visible')) setTimeout(toggleErrorMessage, 2500, false);
}

// =====================================================================
// Logic that handles the creation and downloading of the markdown file.
// =====================================================================

/**
 * Downloads the chat as a markdown file.
 * Function taken and adapted from this reddit conversation: https://www.reddit.com/r/ChatGPT/comments/zm237o/comment/jdjwyyo/?utm_source=share&utm_medium=web2x&context=3
 * kudos to Creative_Original918 for the original code.
 */
function handleClick() {
  const chatMessages = document.querySelectorAll('.text-base');

  // Handle error if messages are not found.
  if (!chatMessages.length) {
    toggleErrorMessage(true);
    return;
  }

  const fileName = document.title + '.md';

  let markdownContent = getTextFromChat(chatMessages, document.title);
  markdownContent = removeSpanTagNesting(markdownContent);
  markdownContent = convertHtmlCodeBlocksToMarkdown(markdownContent);
  markdownContent = normalizeMarkdownContent(markdownContent);
  markdownContent = removeMarkdownTags(markdownContent);

  downloadChat(fileName, markdownContent);
}

/**
 * Converts the chat messages into markdown.
 * @param {NodeList} chatMessages The chat messages to be converted.
 * @returns {string} The chat messages in markdown format.
 */
function getTextFromChat(chatMessages, title) {
  let iteration = 0;
  let markdownContent = `# ${title} \n`;

  for (const message of chatMessages) {
    if (message.querySelector(".whitespace-pre-wrap")) {
      let messageText = message.querySelector('.whitespace-pre-wrap').innerHTML;
      const sender = message.querySelector('img') ? 'You' : 'ChatGPT';

      messageText = messageText.replace(/_/gs, "\_")   // replaces all underscores with an escaped underscore.
                                .replace(/\*/gs, "\*")  // replaces all asterisks with an escaped asterisk.
                                .replace(/\^/gs, "\^")  // replaces all carets with an escaped caret.
                                .replace(/~/gs, "\~")   // replaces all tildes with an escaped tilde.
                                .replace(/#/gs, "\#")   // replaces all hash symbols with an escaped hash symbol.
                                .replace(/>/gs, "\>")   // replaces all greater-than symbols with an escaped greater-than symbol.
                                .replace(/\|/gs, "\|"); // replaces all vertical bars with an escaped vertical bar.

      messageText = messageText.replace(/<p>(.*?)<\/p>/g, function (pTag, innerText) { 	// Replace all <p> tags with newlines.
        return '\n' + innerText.replace(/<b>(.*?)<\/b>/g, '**$1**') 										// Replace all <b> tags with **.
                                .replace(/<\/?b>/g, "**") 															// Replace all <b> and </b> tags with **.
                                .replace(/<\/?i>/g, "_") 																// Replace all <i> tags with underscores
                                .replace(/<code>/g, " `") 															// Replace all occurences of "<code>" with " `"
                                .replace(/<\/code>/g, "` ") + '\n'; 										// Replace all occurences of "</code>" with "` " and add a newline.
      });

      const messageSeparator = iteration === 0 ? '' : '***\n\n';
      markdownContent += `${messageSeparator} **${sender}:** <br> \n ${messageText.trim()}\n\n`;
      iteration++;
    }
  }

  return markdownContent;
}

/**
 * The markdown that chatGPT generates includes nesting <span> tags.
 * Here we are removing all <span> tags up to 5 levels of indentation.
 * This is a bit of a hacky solution, but it works for now.
 * @param {string} markdownContent The markdown content to be cleaned.
 * @returns {string} The cleaned markdown content.
 */
function removeSpanTagNesting(markdownContent) {
  const repeatSpan = /<span class="[^"]*">([^<]*?)<\/span>/gs;
  const newmarkdownContentFormated = markdownContent.replace(repeatSpan, "$1")
                                                    .replace(repeatSpan, "$1")
                                                    .replace(repeatSpan, "$1")
                                                    .replace(repeatSpan, "$1")
                                                    .replace(repeatSpan, "$1");
  return newmarkdownContentFormated;
}

/**
 * Replace all <pre> tags with ``` and the language.
 * This is a bit of a hacky solution, but it works for now.
 * @param {string} markdownContent The markdown content to be cleaned.
 * @returns {string} The cleaned markdown content.
 */
function convertHtmlCodeBlocksToMarkdown(markdownContent) {
  const newmarkdownContentFormated = markdownContent.replace(/<pre>.*?<code[^>]*>(.*?)<\/code>.*?<\/pre>/gs, function (codeBlock, codeBlockContent) {
    const language = codeBlock.match(/class="[^"]*language-([^"\s]*)[^"]*"/);
    const languageIs = language ? language[1] : 'text';
    return '\n``` ' + languageIs + '\n' + codeBlockContent + '```\n';
  });

  return newmarkdownContentFormated;
}

/**
 * This is to remove the <p> tags that are left over after the <pre> tags are removed.
 * @param {string} markdownContent The markdown content to be cleaned.
 * @returns {string} The cleaned markdown content.
 */
function normalizeMarkdownContent(markdownContent) {
  const newmarkdownContentFormated = markdownContent.replace(/<p>(.*?)<\/p>/g, function (htmlTag, innerText) {
    return '\n' + innerText.replace(/<b>(.*?)<\/b>/g, '**$1**') 	// Replace all <b> tags with **.
                            .replace(/<\/?b>/g, "**")  						// Replace all <b> and </b> tags with **.
                            .replace(/<\/?i>/g, "_")   						// Replace all <i> tags with underscores
                            .replace(/<code>/g, " `")   					// Replace all occurences of "<code>" with " `"
                            .replace(/<\/code>/g, "` ") + '\n';	 	// Replace all occurences of "</code>" with "` " and add a newline.
  });

  return newmarkdownContentFormated;
}

/**
 * Remove the <div> tags that are left over after the <pre> tags are removed.
 * The user can have it on dark or light mode. This regex will match both.
 * @param {string} markdownContent The markdown content to be cleaned.
 * @returns {string} The cleaned markdown content.
 */
function removeMarkdownTags(markdownContent) {
  const newmarkdownContentFormated = markdownContent.replace(/<div class="markdown prose w-full break-words (?:dark|light):prose-invert (?:dark|light)">/gs, "") 	// Remove the first <div> tag.
                                                    .replace(/\r?\n?<\/div>\r?\n?/gs, "\n") 																																			// Remove the last <div> tag.
                                                    .replace(/\*\*ChatGPT:\*\* <(ol|ul)/gs, "**ChatGPT:**\n<$1") 																									// Remove the <br> tag that is left over after the <pre> tags are removed.
                                                    .replace(/&gt;/gs, ">") 																																											// Replace all &gt; with >
                                                    .replace(/&lt;/gs, "<") 																																											// Replace all &lt; with <
                                                    .replace(/&amp;/gs, "&"); 																																										// Replace all &amp; with &
  return newmarkdownContentFormated;
}

/**
 * Downloads the chat as a markdown file by creating a download link and clicking it.
 * @param {string} fileName The name of the file to be downloaded.
 * @param {string} markdownContent The content of the file to be downloaded.
 */
function downloadChat(fileName, markdownContent) {
  const downloadLink = document.createElement('a');
  downloadLink.download = fileName;
  downloadLink.href = URL.createObjectURL(new Blob([markdownContent], { type: 'text/markdown' }));
  downloadLink.style.display = 'none';
  document.body.appendChild(downloadLink);
  downloadLink.click();
}
