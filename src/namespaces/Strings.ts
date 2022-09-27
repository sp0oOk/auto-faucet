
export namespace Strings {

    /**
     * This function formats a string with the given arguments.
     * 
     * @param str The string to format.
     * @param args The arguments to format the string with.
     * @returns The formatted string.
     */

    export function format(str: string, ...args: any[]): string {
        return str.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    }

}