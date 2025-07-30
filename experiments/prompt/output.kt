<kotlin>
open class Owner : Person() {

    // Fields with getters and setters converted to property accessors
    @field:NotBlank
    private var address: String? = null

    @field:NotBlank
    private var city: String? = null

    @field:NotBlank
    @field:Pattern(regexp = "\d{10}", message = "{telephone.invalid}")
    private var telephone: String? = null

    // Pets field with proper mutability and constraints
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id")
    @OrderBy("name")
    private final val pets = mutableListOf<Pet>()

    // Convert the addPet method to a property setter or keep as is?
    fun addPet(pet: Pet) {
        if (pet.isNew()) {
            pets.add(pet)
        }
    }

    // Getters and setters for address, city, telephone
    @field:NotBlank
    fun getAddress(): String? = this.address

    fun setAddress(address: String?) {
        this.address = address
    }

    @field:NotBlank
    fun getCity(): String? = this.city

    fun setCity(city: String?) {
        this.city = city
    }

    // Convert telephone to a non-null property with validation via annotations?
    // But note the constraints in Java, so we'll keep it nullable for now.
    fun getTelephone(): String? = this.telephone

    fun setTelephone(telephone: String?) {
        this.telephone = telephone
    }

    // Getters and setters for pets (but note that pets is a List)
    fun getPets(): List<Pet> = pets

    // We cannot directly set the entire list because it's private final, so we keep the getter only?
    // But in Java there was no setter for the entire list.

    // Convert getPet methods to extension functions or properties? 
    // Since they are tied to this instance, better as member functions.
    fun getPet(name: String?): Pet {
        return if (name == null) {
            null
        } else {
            pets.find { it.name?.equals(name, ignoreCase = true) ?: false }
                ?.let { it }
                ?: run {
                    // Check for new pet with the same name?
                    val newPet = Pet().apply { this.name = name }
                    pets.add(newPet)
                    return newPet
                }
        }
    }

    fun getPet(id: Int): Pet? {
        for (pet in pets) {
            if (!pet.isNew()) {
                if (pet.id == id) {
                    return pet
                }
            } else {
                // Check the name of a new pet?
                val compId = pet.id
                if (compId != null && compId == id) {
                    return pet
                }
            }
        }
        return null
    }

    fun getPet(name: String?, ignoreNew: Boolean): Pet? {
        for (pet in pets) {
            // Check the name of a new pet?
            val compName = pet.name
            if (compName != null && compName.equals(name, ignoreCase = true)) {
                return if (!ignoreNew || !pet.isNew()) {
                    pet
                } else {
                    null
                }
            }
        }
        return null
    }

    // Convert the addVisit method to a property setter or keep as is?
    fun addVisit(petId: Int, visit: Visit) {
        Assert.notNull(petId, "Pet identifier must not be null!")
        Assert.notNull(visit, "Visit must not be null!")

        val pet = getPet(petId)
        if (pet == null) {
            throw IllegalArgumentException("Invalid Pet identifier")
        }

        // Add the visit to the pet
        pet.addVisit(visit)
    }
}

// Convert toString method using Kotlin's string templates and property accessors?
override fun toString(): String {
    return "Owner(id=${id}, new=${isNew()}, lastName=${lastName}, firstName=${firstName}, address=${address}, city=${city}, telephone=${telephone})"
}
</kotlin>