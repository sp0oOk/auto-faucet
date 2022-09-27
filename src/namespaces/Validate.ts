
export namespace Validate {

    /**
     * This function validates that the given value is a string.
     * 
     * @param values The values to check.
     * @returns True if all values are not null or undefined, false otherwise.
     */

    export function nonNullEmpty(...values: string[]): boolean {
        for (const value of values) {
            if (value === null || value === undefined || value === "") {
                return false;
            }
        }
        return true;
    }

}