// Worker console output is not forwarded by the test pool. Emit the structured
// measurement annotation from the Node reporter instead.
export default class CapacityReporter {
 onTestCaseResult(test){
  for(const annotation of test.annotations())if(annotation.message.startsWith('CAPACITY_RESULT '))process.stdout.write(annotation.message+'\n');
 }
}
