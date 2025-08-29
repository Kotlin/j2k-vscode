# J2K Prompt V5

This version uses the same prompt as in V2, but sends the request to GitHub Copilot instead. Observed stats:

|file                      |milliseconds|seconds|
|--------------------------|------------|-------|
|OwnerController.java      |148673      |148.673|
|PetController.java        |129058      |129.058|
|Owner.java                |82902       |82.902 |
|PetValidator.java         |64002       |64.002 |
|OwnerRepository.java      |56017       |56.017 |
|VisitController.java      |44103       |44.103 |
|VetRepository.java        |42877       |42.877 |
|Pet.java                  |34903       |34.903 |
|PetTypeRepository.java    |27738       |27.738 |
|Person.java               |27578       |27.578 |
|PetClinicRuntimeHints.java|26924       |26.924 |
|Vet.java                  |26654       |26.654 |
|package-info.java         |23925       |23.925 |
|CacheConfiguration.java   |23720       |23.72  |
|VetController.java        |23261       |23.261 |
|NamedEntity.java          |19983       |19.983 |
|PetType.java              |19583       |19.583 |
|Visit.java                |17797       |17.797 |
|Vets.java                 |16910       |16.91  |
|WebConfiguration.java     |14969       |14.969 |
|PetTypeFormatter.java     |14660       |14.66  |
|BaseEntity.java           |11030       |11.03  |
|CrashController.java      |10557       |10.557 |
|PetClinicApplication.java |10315       |10.315 |
|Specialty.java            |8029        |8.029  |
|WelcomeController.java    |7944        |7.944  |

The average time to convert per file was about 35 seconds, and it took 15.5 minutes to convert the whole of spring-petclinic.