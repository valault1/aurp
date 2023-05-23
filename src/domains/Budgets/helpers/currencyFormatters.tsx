// thanks chatgpt
function addCommasToNumber(number: number | string): string {
  const numberString = number.toString(); // Convert the number to a string

  const parts = numberString.split("."); // Split the number into integer and decimal parts (if any)
  let integerPart = parts[0];
  const decimalPart = parts[1] || "";

  const integerLength = integerPart.length;

  if (integerLength <= 3) {
    // If the integer part has 3 or fewer digits, no need for commas
    return numberString;
  }

  const commaCount = Math.floor((integerLength - 1) / 3); // Calculate the number of commas needed
  const result = [];

  for (let i = 0; i < commaCount; i++) {
    const startIndex = integerLength - (i + 1) * 3; // Calculate the start index of the current comma group
    const commaGroup = integerPart.substring(startIndex, startIndex + 3); // Get the current comma group
    result.unshift(commaGroup); // Add the comma group to the result array
  }

  const remainingDigits = integerLength % 3 || 3; // Calculate the number of digits in the first comma group
  const firstGroup = integerPart.substr(0, remainingDigits); // Get the first comma group
  result.unshift(firstGroup); // Add the first comma group to the result array

  const formattedIntegerPart = result.join(","); // Join the comma groups with commas

  return decimalPart
    ? `${formattedIntegerPart}.${decimalPart}`
    : formattedIntegerPart; // Combine the integer and decimal parts (if any) and return the formatted number
}

export const formatCurrency = (amount: string | number) => {
  let amountStr = amount.toString().replace(/,/, "").replace(/\$/, "");
  if (amountStr.charAt(0) === "$") amountStr = amountStr.substring(1);

  const numberWithDecimals = Number(amountStr).toFixed(2);
  return `$${addCommasToNumber(numberWithDecimals)}`;
};
