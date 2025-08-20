package org.springframework.samples.petclinic.owner

import java.util.*
import org.springframework.core.style.ToStringCreator
import org.springframework.samples.petclinic.model.Person
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.OneToMany
import jakarta.persistence.OrderBy
import jakarta.persistence.Table
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

/**
 * Simple JavaBean domain object representing an owner.
 *
 * @author Ken Krebs
 * @author Juergen Hoeller
 * @author Sam Brannen
 * @author Michael Isvy
 * @author Oliver Drotbohm
 */
@Entity
@Table(name = "owners")
class Owner : Person() {

    // Fields with validation annotations on the backing field
    @field:NotBlank
    var address: String? = null

    @field:NotBlank
    var city: String? = null

    @field:NotBlank
    @Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
    var telephone: String? = null

    // PetsBackingField with persistence annotations
    @OneToMany(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id")
    @OrderBy("name")
    private val petsBackingField = mutableListOf<Pet>()

    // Provided function for getPets()
    fun getPets(): List<Pet> {
        return petsBackingField
    }

    // Provided function for addPet()
    fun addPet(pet: Pet) {
        if (pet.isNew()) {
            petsBackingField.add(pet)
        }
    }

    // Provided function for getPet(String, boolean)
    fun getPet(name: String?, ignoreNew: Boolean): Pet? {
        return petsBackingField.find { pet ->
            val petName = pet.name ?: ""
            name != null && petName.equalsIgnoreCase(name) &&
                    (!ignoreNew || !pet.isNew())
        }
    }

    // Provided function for getPet(Integer)
    fun getPet(id: Int): Pet? {
        return petsBackingField.find { 
            it.id == id && !it.ignoreNew
        } ?: null
    }

    // Provided function for addVisit()
    fun addVisit(petId: Int, visit: Visit) {
        Assert.notNull(petId, "Pet identifier must not be null!")
        Assert.notNull(visit, "Visit must not be null!")

        val pet = getPet(petId)
        if (pet == null) throw IllegalArgumentException("Invalid Pet identifier!")
        else {
            pet.addVisit(visit)
        }
    }

    // Provided function for toString()
    override fun toString(): String {
        return new ToStringCreator(this).apply {
            append("id", this.id)
            append("new", this.isNew())
            append("lastName", this.lastName)
            append("firstName", this.firstName)
            append("address", this.address)
            append("city", this.city)
            append("telephone", this.telephone)
        }.toString()
    }
}