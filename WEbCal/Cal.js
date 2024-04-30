const $lis = document.querySelectorAll("ul li")
const $result = document.querySelector(".result")

let currentNumber = ''
let previousNumber = ''
let operator = ''
let justCalculated = false

$lis.forEach((node) => {
    node.addEventListener('mousedown', function(event){
        event.preventDefault()
        const value = node.innerText.trim()

        if (!isNaN(value) || value === '.') {
            if (justCalculated) {
                currentNumber = value
                justCalculated = false
            } else {
                currentNumber += value
            }
            $result.innerText = currentNumber
        } else if (value === 'AC') {
            currentNumber = ''
            previousNumber = ''
            operator = ''
            $result.innerText = '0'
        } else if (value === '=') {
            if (previousNumber !== '' && operator !== '') {
                const expression = `${previousNumber} ${operator} ${currentNumber}`
                const result = eval(expression)
                $result.innerText = result
                currentNumber = result.toString()
                previousNumber = ''
                operator = ''
                justCalculated = true
            }
        } else {
            previousNumber = currentNumber
            operator = value
            currentNumber = ''
            justCalculated = false
        }
    })
})