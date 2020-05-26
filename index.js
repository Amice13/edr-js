// Read a file from zip
const StreamZip = require('node-stream-zip')

// Convert the file from CP1251
const iconv = require('iconv-lite')
const converterStream = iconv.decodeStream('win1251')

// Split strings
const split2 = require('split2')

// Parse XML to JSON
const parser = require('fast-xml-parser')
const he = require('he')

// Set options for the xml parser
const options = {
  attributeNamePrefix : '@_',
  attrNodeName: 'attr', //default is 'false'
  textNodeName : '#text',
  ignoreAttributes : true,
  ignoreNameSpace : false,
  allowBooleanAttributes : false,
  parseNodeValue : true,
  parseAttributeValue : false,
  trimValues: true,
  cdataTagName: '__cdata', //default is 'false'
  cdataPositionChar: '\\c',
  parseTrueNumberOnly: false,
  arrayMode: false, //"strict"
  attrValueProcessor: (val, attrName) => he.decode(val, { isAttributeValue: true }),
  tagValueProcessor : (val, tagName) => he.decode(val),
  stopNodes: ['parse-me-as-string']
}

// The zip file to process
const file = '17-ufop_full_08-05-2020.zip'

// The specific zipped file in the zip (uncomment the one you need)
const fileName = '17.1-EX_XML_EDR_UO_FULL_08.05.2020.xml'
// const fileName2 = '17.2-EX_XML_EDR_FOP_FULL_08.05.2020.xml'

// Start zip streaming
const zip = new StreamZip({ file, storeEntries: true })
 
// Handle errors of zip stream
zip.on('error', err => { console.log(err) })

// Read zip stream
zip.on('ready', () => {
  zip.stream(fileName, (err, stm) => {
    stm.pipe(converterStream).pipe(split2(/(?=<SUBJECT)/g)).on('data', processObject)
    stm.on('end', () => zip.close())
  })
})

// Process an object
const processObject = xml => {
  if (!xml.match(/SUBJECT/i)) return false
  const data = parser.parse(xml, options, true)
  const organization = data.SUBJECT

  // Check double quotes ''
  if (organization.NAME && organization.NAME.match(/''/g)) console.log(organization.NAME)

  // Check that the string doesn't start with a space
  if (organization.CONTACTS) {
    // Convert number to string (in case if a phone number was recognized as a string)
    organization.CONTACTS = organization.CONTACTS + ''

    // Split data by regex
    let contacts = organization.CONTACTS.split(/;/g)
    for (let contact of contacts) {
      if (contact.match(/\s$/)) console.log(contact)
    }
  }

  // Check if EDRPOU is valid
  if (organization.EDRPOU) {
    // COnvert number to string
    organization.EDRPOU = organization.EDRPOU + ''

    // Check EDRPOUs those do not match 8 symbols
    if (!organization.EDRPOU.match(/^........$/)) {
      console.log(organization.EDRPOU)      
      // Fix such EDRPOUs
      organization.EDRPOU = organization.EDRPOU.padStart(8, '0')
    }

    // Output all EDRPOUs
    console.log(organization.EDRPOU)
  }

  // Extract registration date
  if (organization.REGISTRATION) {
    console.log(organization.REGISTRATION.match(/\d{2}\.\d{2}\.\d{2,4}/g))
  }

  // Research companies' founders

  if (organization.FOUNDERS) {
    // Make an array if the field is a string
    if (!Array.isArray(organization.FOUNDERS.FOUNDER)) {
      organization.FOUNDERS.FOUNDER = [organization.FOUNDERS.FOUNDER]
    }

    // Find founders with EDRPOUs
    for (let founder of organization.FOUNDERS.FOUNDER) {
      if (founder.match(/\d{8}/g)) console.log(founder)
    }

    // Get names of founders
    for (let founder of organization.FOUNDERS.FOUNDER) {
      if (founder.match(/^[А-ЯЄІЇҐ]+\s[А-ЯЄІЇҐ]+\s[А-ЯЄІЇҐ]+/g)) console.log(founder.match(/^[А-ЯЄІЇҐ]+\s[А-ЯЄІЇҐ]+\s[А-ЯЄІЇҐ]+/g))
    }

    // Check wrong apostrophes
    for (let founder of organization.FOUNDERS.FOUNDER) {
      if (founder.match(/[бпвмф][*”»"][яєюї]/ig)) console.log(founder)
    }

    // Get money of founders
    for (let founder of organization.FOUNDERS.FOUNDER) {
      if (founder.match(/\d+[,.]\d{2} грн./ig)) console.log(founder.match(/\d+[,.]\d{2}(?= грн.)/ig))
    }

    // Better option to get names of founders
    for (let founder of organization.FOUNDERS.FOUNDER) {
      if (founder.match(/[^ ]+ [^ ]+ [^ ]+(ивна|івна|ович)/ig)) console.log(founder.match(/[^ ]+ [^ ]+ [^ ]+(ивна|івна|ович)/ig))
    }

  }

  // Get dates and convert them to ISO
  if (organization.REGISTRATION) {
    console.log(organization.REGISTRATION.replace(/.*(\d{2})\.(\d{2})\.(\d{4}).*/, '$3-$2-$1'))
  }

}

